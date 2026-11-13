/**
 * CleanTraffic Classification Micro-Batch Write Buffer
 * 
 * Solves the high-concurrency database exhaustion problem:
 * - Decouples real-time classification verdicts from database writes.
 * - Flushes records in micro-batches every 1,000ms or when 50 records accumulate.
 * - Uses single multi-row parameterized SQL queries instead of N sequential round-trips.
 * - Caps memory queue size to 5,000 items to prevent V8 OOM during DB latency spikes.
 * - Includes process lifecycle hooks (SIGTERM, SIGINT, beforeExit) to flush pending
 *   in-flight items before server shutdown, preventing data loss.
 * - Updates central Redis cache immediately so repeat visits are recognized in RAM.
 */

import { randomUUID } from "crypto";
import type { InsertClassification, Classification } from "@shared/schema";
import { cacheService } from "./cacheService";
import { pool } from "./db";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseClient: SupabaseClient | null = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export interface BufferedClassificationItem {
  id: string;
  data: Classification;
  enqueuedAt: number;
}

class ClassificationWriteBuffer {
  private queue: BufferedClassificationItem[] = [];
  private recentHistory: Classification[] = [];
  private readonly MAX_RECENT_HISTORY = 100;
  private readonly MAX_QUEUE_CAP = 5000;       // Max items to hold before dropping to prevent OOM
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 1000;   // 1 second micro-batching
  private readonly BATCH_SIZE_THRESHOLD = 50;  // Flush immediately if 50 items accumulate
  private readonly MAX_BATCH_SIZE = 450;       // Optimal batch commit size
  private isFlushing = false;

  constructor() {
    this.startTimer();
    this.registerProcessHooks();
  }

  private startTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0 && !this.isFlushing) {
        void this.flush();
      }
    }, this.FLUSH_INTERVAL_MS);
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  private registerProcessHooks() {
    const handleShutdown = async (signal: string) => {
      console.log(`[SHUTDOWN] Received ${signal}. Flushing ${this.queue.length} buffered classifications to database...`);
      try {
        await this.flush();
      } catch (err) {
        console.error("[SHUTDOWN] Error flushing classifications on exit:", err);
      }
    };

    process.once("SIGTERM", () => { void handleShutdown("SIGTERM"); });
    process.once("SIGINT", () => { void handleShutdown("SIGINT"); });
    process.once("beforeExit", () => { void handleShutdown("beforeExit"); });
  }

  enqueue(record: Classification | (InsertClassification & { id?: string })): Classification {
    const finalRecord: Classification = {
      id: record.id || randomUUID(),
      timestamp: (record as any).timestamp ? new Date((record as any).timestamp) : new Date(),
      ipAddress: record.ipAddress || '0.0.0.0',
      location: record.location || 'Unknown',
      country: record.country || 'Unknown',
      countryCode: record.countryCode || 'Unknown',
      city: record.city || 'Unknown',
      region: record.region || '',
      browser: record.browser || 'Unknown',
      deviceType: record.deviceType || 'Unknown',
      deviceId: record.deviceId || null,
      visitorId: record.visitorId || null,
      isNewVisitor: record.isNewVisitor ?? null,
      firstSeen: record.firstSeen ? new Date(record.firstSeen) : null,
      lastSeen: record.lastSeen ? new Date(record.lastSeen) : null,
      visitCount: record.visitCount ?? null,
      visitorType: record.visitorType || 'Human',
      isp: record.isp || 'Unknown',
      detectionMethod: record.detectionMethod || 'IP Analysis',
      connectionType: record.connectionType || null,
      apiKeyId: record.apiKeyId || null,
      adNetwork: record.adNetwork || null,
      clickToken: record.clickToken || null,
      clickId: record.clickId || null,
      trafficType: record.trafficType || null,
      isVerifiedReviewer: record.isVerifiedReviewer === true,
      reviewerPlatform: record.reviewerPlatform || null,
      userAgent: record.userAgent || null,
      clientSignals: (record.clientSignals as any) || null,
      requestHeaders: (record.requestHeaders as any) || null,
      responseDetails: (record.responseDetails as any) || null,
      timelineEvents: (record.timelineEvents as any) || null,
      riskScore: record.riskScore ?? null,
      usageType: record.usageType || null,
    };

    // 1. Immediately update Redis & RAM visitor cache so sub-second subsequent visits are recognized
    cacheService.recordVisitorHistory(
      finalRecord.apiKeyId || null,
      finalRecord.deviceId || 'unknown',
      finalRecord.ipAddress,
      {
        isNewVisitor: false,
        visitCount: (finalRecord.visitCount || 1),
        firstSeen: finalRecord.firstSeen ? new Date(finalRecord.firstSeen) : new Date(finalRecord.timestamp),
        lastSeen: new Date(finalRecord.timestamp),
        existingVisitorId: finalRecord.visitorId || null,
      }
    );

    // 2. Keep in sliding recent in-memory history (for immediate UI display)
    this.recentHistory.unshift({ ...finalRecord });
    if (this.recentHistory.length > this.MAX_RECENT_HISTORY) {
      this.recentHistory = this.recentHistory.slice(0, this.MAX_RECENT_HISTORY);
    }

    // 3. Prevent memory unbounded growth if database is experiencing severe degradation
    if (this.queue.length >= this.MAX_QUEUE_CAP) {
      console.warn(`⚠️ [CLASSIFICATION_BUFFER] Memory queue reached capacity (${this.MAX_QUEUE_CAP}). Dropping oldest 100 entries to prevent OOM.`);
      this.queue.splice(0, 100);
    }

    // 4. Push to micro-batch queue
    this.queue.push({
      id: finalRecord.id,
      data: finalRecord,
      enqueuedAt: Date.now(),
    });

    // 5. Flush immediately if batch size threshold is reached
    if (this.queue.length >= this.BATCH_SIZE_THRESHOLD && !this.isFlushing) {
      void this.flush();
    }

    return finalRecord;
  }

  getRecentClassifications(limitCount = 20): Classification[] {
    return this.recentHistory.slice(0, limitCount);
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;

    // Splice up to MAX_BATCH_SIZE items
    const batchItems = this.queue.splice(0, this.MAX_BATCH_SIZE);

    const isSupabase = (process.env.STORAGE_BACKEND || "").toLowerCase().trim() === "supabase" || 
                       (process.env.STORAGE_BACKEND || "").toLowerCase().trim() === "postgres" ||
                       !!supabaseClient;

    let flushedToSupabase = false;

    // Fast Path: Single Multi-Row parameterized Postgres Batch Insert via Pool
    if (isSupabase && pool) {
      try {
        const CHUNK_SIZE = 50; // 50 items * 34 params = 1,700 params (well below Postgres 65,535 limit)
        for (let c = 0; c < batchItems.length; c += CHUNK_SIZE) {
          const chunk = batchItems.slice(c, c + CHUNK_SIZE);
          const valueClauses: string[] = [];
          const params: any[] = [];
          let paramIdx = 1;

          for (const item of chunk) {
            const d = item.data;
            const clauseParams: string[] = [];
            const fields = [
              item.id,
              d.ipAddress || "0.0.0.0",
              d.location || null,
              d.country || null,
              d.countryCode || null,
              d.city || null,
              d.region || null,
              d.visitorType || "Human",
              d.detectionMethod || "Direct",
              d.connectionType || null,
              d.isp || null,
              d.browser || null,
              d.deviceType || null,
              d.deviceId || null,
              d.visitorId || null,
              d.isNewVisitor ?? null,
              d.firstSeen ? new Date(d.firstSeen) : null,
              d.lastSeen ? new Date(d.lastSeen) : null,
              d.visitCount ?? null,
              d.apiKeyId || null,
              d.adNetwork || null,
              d.clickToken || null,
              d.clickId || null,
              d.trafficType || null,
              d.isVerifiedReviewer === true,
              d.reviewerPlatform || null,
              d.userAgent || null,
              d.clientSignals ? JSON.stringify(d.clientSignals) : null,
              d.requestHeaders ? JSON.stringify(d.requestHeaders) : null,
              d.responseDetails ? JSON.stringify(d.responseDetails) : null,
              d.timelineEvents ? JSON.stringify(d.timelineEvents) : null,
              d.riskScore ?? null,
              d.usageType || null,
              d.timestamp ? new Date(d.timestamp) : new Date(),
            ];

            for (const val of fields) {
              clauseParams.push(`$${paramIdx++}`);
              params.push(val);
            }
            valueClauses.push(`(${clauseParams.join(", ")})`);
          }

          const queryText = `
            INSERT INTO classifications (
              id, ip_address, location, country, country_code, city, region,
              visitor_type, detection_method, connection_type, isp, browser,
              device_type, device_id, visitor_id, is_new_visitor, first_seen,
              last_seen, visit_count, api_key_id, ad_network, click_token,
              click_id, traffic_type, is_verified_reviewer, reviewer_platform,
              user_agent, client_signals, request_headers, response_details,
              timeline_events, risk_score, usage_type, timestamp
            ) VALUES ${valueClauses.join(", ")}
            ON CONFLICT (id) DO NOTHING;
          `;

          await pool.query(queryText, params);
        }
        flushedToSupabase = true;
      } catch (err: any) {
        console.warn(`[CLASSIFICATION_BUFFER] Failed to flush multi-row batch to pool:`, err?.message || err);
      }
    }

    // Fallback: Supabase REST batch upsert
    if (!flushedToSupabase && isSupabase && supabaseClient) {
      try {
        const rows = batchItems.map((item) => {
          const d = item.data;
          return {
            id: item.id,
            ip_address: d.ipAddress || "0.0.0.0",
            location: d.location || null,
            country: d.country || null,
            country_code: d.countryCode || null,
            city: d.city || null,
            region: d.region || null,
            visitor_type: d.visitorType || "Human",
            detection_method: d.detectionMethod || "Direct",
            connection_type: d.connectionType || null,
            isp: d.isp || null,
            browser: d.browser || null,
            device_type: d.deviceType || null,
            device_id: d.deviceId || null,
            visitor_id: d.visitorId || null,
            is_new_visitor: d.isNewVisitor ?? null,
            first_seen: d.firstSeen ? new Date(d.firstSeen).toISOString() : null,
            last_seen: d.lastSeen ? new Date(d.lastSeen).toISOString() : null,
            visit_count: d.visitCount ?? null,
            api_key_id: d.apiKeyId || null,
            ad_network: d.adNetwork || null,
            click_token: d.clickToken || null,
            click_id: d.clickId || null,
            traffic_type: d.trafficType || null,
            is_verified_reviewer: d.isVerifiedReviewer === true,
            reviewer_platform: d.reviewerPlatform || null,
            user_agent: d.userAgent || null,
            client_signals: d.clientSignals || null,
            request_headers: d.requestHeaders || null,
            responseDetails: d.responseDetails || null,
            timelineEvents: d.timelineEvents || null,
            risk_score: d.riskScore ?? null,
            usage_type: d.usageType || null,
            timestamp: d.timestamp ? new Date(d.timestamp).toISOString() : new Date().toISOString(),
          };
        });
        const { error } = await supabaseClient.from("classifications").upsert(rows, { onConflict: "id" });
        if (!error) {
          flushedToSupabase = true;
        } else {
          console.warn(`[CLASSIFICATION_BUFFER] Supabase REST flush error:`, error.message);
        }
      } catch (err: any) {
        console.warn(`[CLASSIFICATION_BUFFER] Supabase REST client error:`, err?.message || err);
      }
    }

    this.isFlushing = false;
    // If items accumulated while we were flushing, trigger another flush
    if (this.queue.length >= this.BATCH_SIZE_THRESHOLD) {
      void this.flush();
    }
  }

  getPendingCount(): number {
    return this.queue.length;
  }
}

export const classificationBuffer = new ClassificationWriteBuffer();

/**
 * CleanTraffic Classification Micro-Batch Write Buffer
 * 
 * Solves the high-concurrency database exhaustion problem:
 * - Decouples real-time classification verdicts from database writes.
 * - Flushes records in micro-batches every 1,000ms or when 50 records accumulate.
 * - Includes process lifecycle hooks (SIGTERM, SIGINT, beforeExit) to flush pending
 *   in-flight items before server shutdown, preventing data loss.
 * - Updates in-memory visitor cache immediately so repeat visits are recognized in RAM.
 */

import type { InsertClassification, Classification } from "@shared/schema";
import { cacheService } from "./cacheService";
import { pool, isDatabaseConfigured } from "./db";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseClient: SupabaseClient | null = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export interface BufferedClassificationItem {
  id: string;
  data: any;
  enqueuedAt: number;
}

class ClassificationWriteBuffer {
  private queue: BufferedClassificationItem[] = [];
  private recentHistory: Classification[] = [];
  private readonly MAX_RECENT_HISTORY = 100;
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 1000; // 1 second micro-batching
  private readonly BATCH_SIZE_THRESHOLD = 50;  // Flush immediately if 50 items accumulate
  private readonly MAX_BATCH_SIZE = 450;       // Firestore max batch limit is 500
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
    // Don't keep event loop alive if nothing else is running
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

  enqueue(record: Classification): void {
    // 1. Immediately update in-memory visitor history so sub-second subsequent visits are recognized
    cacheService.recordVisitorHistory(
      record.apiKeyId || null,
      record.deviceId || 'unknown',
      record.ipAddress,
      {
        isNewVisitor: false,
        visitCount: (record.visitCount || 1),
        firstSeen: record.firstSeen ? new Date(record.firstSeen) : new Date(record.timestamp),
        lastSeen: new Date(record.timestamp),
        existingVisitorId: record.visitorId || null,
      }
    );

    // 2. Keep in sliding recent in-memory history (for immediate UI display during quota outages)
    this.recentHistory.unshift({ ...record });
    if (this.recentHistory.length > this.MAX_RECENT_HISTORY) {
      this.recentHistory = this.recentHistory.slice(0, this.MAX_RECENT_HISTORY);
    }

    // 3. Push to micro-batch queue
    this.queue.push({
      id: record.id,
      data: {
        ...record,
        firstSeen: record.firstSeen ? new Date(record.firstSeen) : null,
        lastSeen: record.lastSeen ? new Date(record.lastSeen) : null,
        timestamp: record.timestamp ? new Date(record.timestamp) : new Date(),
      },
      enqueuedAt: Date.now(),
    });

    // 4. Flush immediately if batch size threshold is reached
    if (this.queue.length >= this.BATCH_SIZE_THRESHOLD && !this.isFlushing) {
      void this.flush();
    }
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
    if (isSupabase && pool) {
      try {
        for (const item of batchItems) {
          const d = item.data;
          await pool.query(`
            INSERT INTO classifications (
              id, ip_address, location, country, country_code, city, region,
              visitor_type, detection_method, connection_type, isp, browser,
              device_type, device_id, visitor_id, is_new_visitor, first_seen,
              last_seen, visit_count, api_key_id, ad_network, click_token,
              click_id, traffic_type, is_verified_reviewer, reviewer_platform,
              user_agent, client_signals, request_headers, response_details,
              timeline_events, risk_score, usage_type, timestamp
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
              $29, $30, $31, $32, $33, $34
            )
            ON CONFLICT (id) DO NOTHING;
          `, [
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
          ]);
        }
        flushedToSupabase = true;
      } catch (err: any) {
        console.warn(`[CLASSIFICATION_BUFFER] Failed to flush batch to Supabase pool:`, err?.message || err);
      }
    }

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
            response_details: d.responseDetails || null,
            timeline_events: d.timelineEvents || null,
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

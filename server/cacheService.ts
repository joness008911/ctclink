/**
 * CleanTraffic Production Redis Cache Service
 * 
 * Provides sub-millisecond RAM lookups directly from Redis for the high-frequency decision paths:
 * - API Keys (cleantraffic:apikey:*)
 * - Client Users (cleantraffic:clientuser:*)
 * - Detection Rules (cleantraffic:detection_rules)
 * - User Redirect URLs & Routing Configurations (cleantraffic:redirecturls:*)
 * - Global Settings (cleantraffic:settings:*)
 * - Visitor History & Velocity Tracking (cleantraffic:visitor:*, cleantraffic:velocity:*)
 * 
 * Prevents database read roundtrips under heavy traffic and enforces zero local in-memory state.
 */

import type { ApiKey, ClientUser, DetectionRules, UserRedirectUrls } from "@shared/schema";
import { redisClient } from "./redis";

class FastCacheService {
  // 10 minutes standard configuration TTL (in seconds for Redis)
  private readonly DEFAULT_TTL_SEC = 10 * 60;
  private readonly VISITOR_TTL_SEC = 24 * 60 * 60; // 24h

  // --- API KEY CACHING ---
  async getApiKey(keyOrId: string): Promise<ApiKey | undefined> {
    try {
      const data = await redisClient.get(`cleantraffic:apikey:${keyOrId}`);
      if (!data) return undefined;
      return JSON.parse(data) as ApiKey;
    } catch (err) {
      console.warn(`[CACHE_ERROR] getApiKey(${keyOrId}):`, err);
      return undefined;
    }
  }

  async setApiKey(key: ApiKey, ttlSec: number = this.DEFAULT_TTL_SEC): Promise<void> {
    try {
      const serialized = JSON.stringify(key);
      const pipeline = redisClient.pipeline();
      if (key.id) pipeline.set(`cleantraffic:apikey:${key.id}`, serialized, "EX", ttlSec);
      if (key.keyValue) pipeline.set(`cleantraffic:apikey:${key.keyValue}`, serialized, "EX", ttlSec);
      await pipeline.exec();
    } catch (err) {
      console.warn(`[CACHE_ERROR] setApiKey:`, err);
    }
  }

  async invalidateApiKey(keyOrId: string): Promise<void> {
    try {
      const existing = await this.getApiKey(keyOrId);
      const pipeline = redisClient.pipeline();
      pipeline.del(`cleantraffic:apikey:${keyOrId}`);
      if (existing) {
        if (existing.id && existing.id !== keyOrId) pipeline.del(`cleantraffic:apikey:${existing.id}`);
        if (existing.keyValue && existing.keyValue !== keyOrId) pipeline.del(`cleantraffic:apikey:${existing.keyValue}`);
      }
      await pipeline.exec();
    } catch (err) {
      console.warn(`[CACHE_ERROR] invalidateApiKey(${keyOrId}):`, err);
    }
  }

  // --- CLIENT USER CACHING ---
  async getClientUser(userId: string): Promise<ClientUser | undefined> {
    try {
      const data = await redisClient.get(`cleantraffic:clientuser:${userId}`);
      if (!data) return undefined;
      return JSON.parse(data) as ClientUser;
    } catch (err) {
      console.warn(`[CACHE_ERROR] getClientUser(${userId}):`, err);
      return undefined;
    }
  }

  async getClientUserByApiKey(apiKeyId: string): Promise<ClientUser | undefined> {
    try {
      const userId = await redisClient.get(`cleantraffic:apikey_to_user:${apiKeyId}`);
      if (!userId) return undefined;
      return this.getClientUser(userId);
    } catch (err) {
      console.warn(`[CACHE_ERROR] getClientUserByApiKey(${apiKeyId}):`, err);
      return undefined;
    }
  }

  async setClientUser(user: ClientUser, ttlSec: number = this.DEFAULT_TTL_SEC): Promise<void> {
    try {
      const serialized = JSON.stringify(user);
      const pipeline = redisClient.pipeline();
      if (user.id) pipeline.set(`cleantraffic:clientuser:${user.id}`, serialized, "EX", ttlSec);
      if (user.apiKeyId && user.id) {
        pipeline.set(`cleantraffic:apikey_to_user:${user.apiKeyId}`, user.id, "EX", ttlSec);
      }
      await pipeline.exec();
    } catch (err) {
      console.warn(`[CACHE_ERROR] setClientUser:`, err);
    }
  }

  async invalidateClientUser(userId: string): Promise<void> {
    try {
      const existing = await this.getClientUser(userId);
      const pipeline = redisClient.pipeline();
      pipeline.del(`cleantraffic:clientuser:${userId}`);
      if (existing?.apiKeyId) {
        pipeline.del(`cleantraffic:apikey_to_user:${existing.apiKeyId}`);
      }
      await pipeline.exec();
    } catch (err) {
      console.warn(`[CACHE_ERROR] invalidateClientUser(${userId}):`, err);
    }
  }

  // --- REDIRECT URLS CACHING ---
  async getRedirectUrls(userId: string): Promise<UserRedirectUrls | undefined> {
    try {
      const data = await redisClient.get(`cleantraffic:redirecturls:${userId}`);
      if (!data) return undefined;
      return JSON.parse(data) as UserRedirectUrls;
    } catch (err) {
      console.warn(`[CACHE_ERROR] getRedirectUrls(${userId}):`, err);
      return undefined;
    }
  }

  async setRedirectUrls(userId: string, urls: UserRedirectUrls, ttlSec: number = this.DEFAULT_TTL_SEC): Promise<void> {
    try {
      await redisClient.set(`cleantraffic:redirecturls:${userId}`, JSON.stringify(urls), "EX", ttlSec);
    } catch (err) {
      console.warn(`[CACHE_ERROR] setRedirectUrls:`, err);
    }
  }

  async invalidateRedirectUrls(userId: string): Promise<void> {
    try {
      await redisClient.del(`cleantraffic:redirecturls:${userId}`);
    } catch (err) {
      console.warn(`[CACHE_ERROR] invalidateRedirectUrls(${userId}):`, err);
    }
  }

  // --- SETTINGS CACHING ---
  async getSetting(key: string): Promise<string | null | undefined> {
    try {
      const data = await redisClient.get(`cleantraffic:settings:${key}`);
      if (data === null) return undefined; // cache miss
      if (data === "__NULL__") return null;
      return data;
    } catch (err) {
      console.warn(`[CACHE_ERROR] getSetting(${key}):`, err);
      return undefined;
    }
  }

  async setSetting(key: string, value: string | null, ttlSec: number = this.DEFAULT_TTL_SEC): Promise<void> {
    try {
      const val = value === null ? "__NULL__" : value;
      await redisClient.set(`cleantraffic:settings:${key}`, val, "EX", ttlSec);
    } catch (err) {
      console.warn(`[CACHE_ERROR] setSetting:`, err);
    }
  }

  async invalidateSetting(key: string): Promise<void> {
    try {
      await redisClient.del(`cleantraffic:settings:${key}`);
    } catch (err) {
      console.warn(`[CACHE_ERROR] invalidateSetting(${key}):`, err);
    }
  }

  // --- DETECTION RULES CACHING ---
  async getDetectionRules(): Promise<DetectionRules | undefined> {
    try {
      const data = await redisClient.get("cleantraffic:detection_rules");
      if (!data) return undefined;
      return JSON.parse(data) as DetectionRules;
    } catch (err) {
      console.warn(`[CACHE_ERROR] getDetectionRules:`, err);
      return undefined;
    }
  }

  async setDetectionRules(rules: DetectionRules, ttlSec: number = this.DEFAULT_TTL_SEC): Promise<void> {
    try {
      await redisClient.set("cleantraffic:detection_rules", JSON.stringify(rules), "EX", ttlSec);
    } catch (err) {
      console.warn(`[CACHE_ERROR] setDetectionRules:`, err);
    }
  }

  async invalidateDetectionRules(): Promise<void> {
    try {
      await redisClient.del("cleantraffic:detection_rules");
    } catch (err) {
      console.warn(`[CACHE_ERROR] invalidateDetectionRules:`, err);
    }
  }

  // --- VISITOR HISTORY IN REDIS ---
  async getVisitorHistory(apiKeyId: string | null, deviceId: string, clientIp: string): Promise<{
    isNewVisitor: boolean;
    visitCount: number;
    firstSeen: Date;
    lastSeen: Date;
    existingVisitorId?: string | null;
  } | undefined> {
    try {
      const key = `cleantraffic:visitor:${apiKeyId || 'global'}:${deviceId}:${clientIp}`;
      const data = await redisClient.get(key);
      if (!data) return undefined;
      const parsed = JSON.parse(data);
      return {
        isNewVisitor: parsed.isNewVisitor,
        visitCount: parsed.visitCount,
        firstSeen: new Date(parsed.firstSeen),
        lastSeen: new Date(parsed.lastSeen),
        existingVisitorId: parsed.existingVisitorId,
      };
    } catch (err) {
      console.warn(`[CACHE_ERROR] getVisitorHistory:`, err);
      return undefined;
    }
  }

  async recordVisitorHistory(apiKeyId: string | null, deviceId: string, clientIp: string, record: {
    isNewVisitor: boolean;
    visitCount: number;
    firstSeen: Date;
    lastSeen: Date;
    existingVisitorId?: string | null;
  }): Promise<void> {
    try {
      const key = `cleantraffic:visitor:${apiKeyId || 'global'}:${deviceId}:${clientIp}`;
      await redisClient.set(key, JSON.stringify(record), "EX", this.VISITOR_TTL_SEC);
    } catch (err) {
      console.warn(`[CACHE_ERROR] recordVisitorHistory:`, err);
    }
  }

  // --- ATOMIC RATE LIMITING & VELOCITY TRACKING ---
  async checkVelocity(deviceId: string, maxPerWindow: number = 5, windowSeconds: number = 60): Promise<{ count: number; isBlocked: boolean }> {
    try {
      const key = `cleantraffic:velocity:${deviceId}`;
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, windowSeconds);
      }
      return {
        count,
        isBlocked: count > maxPerWindow,
      };
    } catch (err) {
      console.warn(`[CACHE_ERROR] checkVelocity(${deviceId}):`, err);
      return { count: 1, isBlocked: false };
    }
  }

  // --- GEOLOCATION CENTRAL REDIS CACHE ---
  async getGeo(ip: string): Promise<any | undefined> {
    try {
      const data = await redisClient.get(`cleantraffic:geo:${ip}`);
      if (!data) return undefined;
      return JSON.parse(data);
    } catch (err) {
      console.warn(`[CACHE_ERROR] getGeo(${ip}):`, err);
      return undefined;
    }
  }

  async setGeo(ip: string, data: any, ttlSec: number = 24 * 60 * 60): Promise<void> {
    try {
      await redisClient.set(`cleantraffic:geo:${ip}`, JSON.stringify(data), "EX", ttlSec);
    } catch (err) {
      console.warn(`[CACHE_ERROR] setGeo(${ip}):`, err);
    }
  }

  // Full cache flush across all cleantraffic namespaces
  async clearAll(): Promise<void> {
    try {
      const keys = await redisClient.keys("cleantraffic:*");
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (err) {
      console.warn(`[CACHE_ERROR] clearAll:`, err);
    }
  }
}

export const cacheService = new FastCacheService();

/**
 * CleanTraffic Fast In-Memory Cache Service
 * 
 * Provides sub-millisecond RAM lookups for the high-frequency decision paths:
 * - API Keys
 * - Client Users (and apiKeyId -> clientUser mappings)
 * - Detection Rules
 * - User Redirect URLs & Routing Configurations
 * - Global Settings (e.g. IP2Geo keys)
 * - In-Memory Visitor History Ring Buffer
 * 
 * Prevents Firestore read quota exhaustion under heavy traffic and reduces
 * classification latency to < 1ms on the read path.
 */

import type { ApiKey, ClientUser, DetectionRules, UserRedirectUrls } from "@shared/schema";

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

class FastCacheService {
  // 10 minutes standard configuration TTL
  private readonly DEFAULT_TTL_MS = 10 * 60 * 1000;

  // Primary memory stores
  private apiKeyStore = new Map<string, CacheEntry<ApiKey>>();
  private apiKeyToUserMap = new Map<string, string>(); // apiKeyId or keyValue -> userId
  private clientUserStore = new Map<string, CacheEntry<ClientUser>>();
  private redirectUrlsStore = new Map<string, CacheEntry<UserRedirectUrls>>();
  private settingsStore = new Map<string, CacheEntry<string | null>>();
  private detectionRulesStore: CacheEntry<DetectionRules> | null = null;

  // In-memory LRU-style ring buffer for visitor history (max 25,000 recent visitors)
  // key: `${apiKeyId || 'global'}:${deviceId}:${clientIp}`
  private visitorHistoryStore = new Map<string, {
    isNewVisitor: boolean;
    visitCount: number;
    firstSeen: Date;
    lastSeen: Date;
    existingVisitorId?: string | null;
    updatedAt: number;
  }>();
  private readonly MAX_VISITOR_HISTORY_ENTRIES = 25000;

  // --- API KEY CACHING ---
  getApiKey(keyOrId: string): ApiKey | undefined {
    const entry = this.apiKeyStore.get(keyOrId);
    if (!entry) return undefined;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.apiKeyStore.delete(keyOrId);
      return undefined;
    }
    return entry.data;
  }

  setApiKey(key: ApiKey, ttlMs: number = this.DEFAULT_TTL_MS): void {
    const entry: CacheEntry<ApiKey> = {
      data: key,
      cachedAt: Date.now(),
      ttlMs,
    };
    if (key.id) this.apiKeyStore.set(key.id, entry);
    if (key.keyValue) this.apiKeyStore.set(key.keyValue, entry);
  }

  invalidateApiKey(keyOrId: string): void {
    const entry = this.apiKeyStore.get(keyOrId);
    if (entry) {
      if (entry.data.id) this.apiKeyStore.delete(entry.data.id);
      if (entry.data.keyValue) this.apiKeyStore.delete(entry.data.keyValue);
    } else {
      this.apiKeyStore.delete(keyOrId);
    }
  }

  // --- CLIENT USER CACHING ---
  getClientUser(userId: string): ClientUser | undefined {
    const entry = this.clientUserStore.get(userId);
    if (!entry) return undefined;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.clientUserStore.delete(userId);
      return undefined;
    }
    return entry.data;
  }

  getClientUserByApiKey(apiKeyId: string): ClientUser | undefined {
    const userId = this.apiKeyToUserMap.get(apiKeyId);
    if (!userId) return undefined;
    return this.getClientUser(userId);
  }

  setClientUser(user: ClientUser, ttlMs: number = this.DEFAULT_TTL_MS): void {
    const entry: CacheEntry<ClientUser> = {
      data: user,
      cachedAt: Date.now(),
      ttlMs,
    };
    if (user.id) this.clientUserStore.set(user.id, entry);
    if (user.apiKeyId) {
      this.apiKeyToUserMap.set(user.apiKeyId, user.id);
    }
  }

  invalidateClientUser(userId: string): void {
    const entry = this.clientUserStore.get(userId);
    if (entry?.data.apiKeyId) {
      this.apiKeyToUserMap.delete(entry.data.apiKeyId);
    }
    this.clientUserStore.delete(userId);
  }

  // --- REDIRECT URLS CACHING ---
  getRedirectUrls(userId: string): UserRedirectUrls | undefined {
    const entry = this.redirectUrlsStore.get(userId);
    if (!entry) return undefined;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.redirectUrlsStore.delete(userId);
      return undefined;
    }
    return entry.data;
  }

  setRedirectUrls(userId: string, urls: UserRedirectUrls, ttlMs: number = this.DEFAULT_TTL_MS): void {
    this.redirectUrlsStore.set(userId, {
      data: urls,
      cachedAt: Date.now(),
      ttlMs,
    });
  }

  invalidateRedirectUrls(userId: string): void {
    this.redirectUrlsStore.delete(userId);
  }

  // --- SETTINGS CACHING ---
  getSetting(key: string): string | null | undefined {
    const entry = this.settingsStore.get(key);
    if (!entry) return undefined; // undefined = cache miss
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.settingsStore.delete(key);
      return undefined;
    }
    return entry.data;
  }

  setSetting(key: string, value: string | null, ttlMs: number = this.DEFAULT_TTL_MS): void {
    this.settingsStore.set(key, {
      data: value,
      cachedAt: Date.now(),
      ttlMs,
    });
  }

  invalidateSetting(key: string): void {
    this.settingsStore.delete(key);
  }

  // --- DETECTION RULES CACHING ---
  getDetectionRules(): DetectionRules | undefined {
    if (!this.detectionRulesStore) return undefined;
    if (Date.now() - this.detectionRulesStore.cachedAt > this.detectionRulesStore.ttlMs) {
      this.detectionRulesStore = null;
      return undefined;
    }
    return this.detectionRulesStore.data;
  }

  setDetectionRules(rules: DetectionRules, ttlMs: number = this.DEFAULT_TTL_MS): void {
    this.detectionRulesStore = {
      data: rules,
      cachedAt: Date.now(),
      ttlMs,
    };
  }

  invalidateDetectionRules(): void {
    this.detectionRulesStore = null;
  }

  // --- VISITOR HISTORY IN-MEMORY CACHE ---
  getVisitorHistory(apiKeyId: string | null, deviceId: string, clientIp: string): {
    isNewVisitor: boolean;
    visitCount: number;
    firstSeen: Date;
    lastSeen: Date;
    existingVisitorId?: string | null;
  } | undefined {
    const key = `${apiKeyId || 'global'}:${deviceId}:${clientIp}`;
    const entry = this.visitorHistoryStore.get(key);
    if (!entry) return undefined;
    return {
      isNewVisitor: entry.isNewVisitor,
      visitCount: entry.visitCount,
      firstSeen: entry.firstSeen,
      lastSeen: entry.lastSeen,
      existingVisitorId: entry.existingVisitorId,
    };
  }

  recordVisitorHistory(apiKeyId: string | null, deviceId: string, clientIp: string, record: {
    isNewVisitor: boolean;
    visitCount: number;
    firstSeen: Date;
    lastSeen: Date;
    existingVisitorId?: string | null;
  }): void {
    const key = `${apiKeyId || 'global'}:${deviceId}:${clientIp}`;
    
    // Simple eviction when capacity exceeded
    if (this.visitorHistoryStore.size >= this.MAX_VISITOR_HISTORY_ENTRIES) {
      const firstKey = this.visitorHistoryStore.keys().next().value;
      if (firstKey) this.visitorHistoryStore.delete(firstKey);
    }

    this.visitorHistoryStore.set(key, {
      ...record,
      updatedAt: Date.now(),
    });
  }

  // Full cache flush (useful for testing or manual admin reload)
  clearAll(): void {
    this.apiKeyStore.clear();
    this.apiKeyToUserMap.clear();
    this.clientUserStore.clear();
    this.redirectUrlsStore.clear();
    this.settingsStore.clear();
    this.detectionRulesStore = null;
    this.visitorHistoryStore.clear();
  }
}

export const cacheService = new FastCacheService();

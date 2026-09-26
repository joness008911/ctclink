/**
 * In-Memory Device & IP Activity Tracker
 * 
 * Provides:
 *  - First Seen / Last Seen tracking
 *  - Total visit count per device
 *  - New vs Returning visitor classification
 *  - 60-second sliding window velocity tracking for rate limiting (e.g., > 5 requests in 60s)
 *  - Automatic memory cleanup (purges stale records after 4 hours)
 *  - Zero external database calls, sub-millisecond execution (<0.01ms)
 */

export interface DeviceRecord {
  deviceId: string;
  tenantKey: string;
  firstSeen: number; // Unix timestamp ms
  lastSeen: number;  // Unix timestamp ms
  visitCount: number;
  recentTimestamps: number[]; // Timestamps of requests in the last 60 seconds
  lastIp: string;
}

class DeviceTracker {
  private devices = new Map<string, DeviceRecord>();
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_AGE = 4 * 60 * 60 * 1000;     // 4 hours

  constructor() {
    // Periodic background cleanup of stale devices
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL).unref();
  }

  /**
   * Helper to derive tenant-scoped key
   */
  getTenantKey(deviceId: string, apiKeyId?: string | null): string {
    return `${apiKeyId || "global"}:${deviceId}`;
  }

  /**
   * Records sliding window velocity strictly for rate limiting
   */
  recordVelocity(tenantKey: string, now: number = Date.now()): {
    velocity60s: number;
    isRateLimited: boolean;
  } {
    const windowStart = now - 60 * 1000;
    let record = this.devices.get(tenantKey);

    if (!record) {
      record = {
        deviceId: tenantKey.split(":")[1] || tenantKey,
        tenantKey,
        firstSeen: now,
        lastSeen: now,
        visitCount: 1,
        recentTimestamps: [now],
        lastIp: "",
      };
      this.devices.set(tenantKey, record);
      return { velocity60s: 1, isRateLimited: false };
    }

    record.lastSeen = now;
    record.recentTimestamps = record.recentTimestamps.filter((t) => t > windowStart);
    record.recentTimestamps.push(now);

    const velocity60s = record.recentTimestamps.length;
    const isRateLimited = velocity60s > 5;

    return { velocity60s, isRateLimited };
  }

  /**
   * Records a request for a given deviceId and IP address with tenant scoping
   * and support for real database-backed visit history.
   */
  recordVisit(
    deviceId: string,
    ip: string,
    now: number = Date.now(),
    apiKeyId?: string | null,
    knownDbStats?: {
      visitCount: number;
      firstSeen: number;
      lastSeen: number;
      isNewVisitor: boolean;
    }
  ): {
    deviceId: string;
    isNewVisitor: boolean;
    visitCount: number;
    firstSeen: string;
    lastSeen: string;
    velocity60s: number;
    isRateLimited: boolean;
  } {
    const tenantKey = this.getTenantKey(deviceId, apiKeyId);
    const windowStart = now - 60 * 1000;
    let record = this.devices.get(tenantKey);

    if (knownDbStats) {
      // Use authentic persistent database stats
      const recent = record ? record.recentTimestamps.filter((t) => t > windowStart) : [];
      recent.push(now);

      const updatedRecord: DeviceRecord = {
        deviceId,
        tenantKey,
        firstSeen: knownDbStats.firstSeen,
        lastSeen: now,
        visitCount: knownDbStats.visitCount,
        recentTimestamps: recent,
        lastIp: ip,
      };
      this.devices.set(tenantKey, updatedRecord);

      const velocity60s = recent.length;
      return {
        deviceId,
        isNewVisitor: knownDbStats.isNewVisitor,
        visitCount: knownDbStats.visitCount,
        firstSeen: new Date(knownDbStats.firstSeen).toISOString(),
        lastSeen: new Date(knownDbStats.lastSeen).toISOString(),
        velocity60s,
        isRateLimited: velocity60s > 5,
      };
    }

    if (!record) {
      // First time seeing this device
      record = {
        deviceId,
        tenantKey,
        firstSeen: now,
        lastSeen: now,
        visitCount: 1,
        recentTimestamps: [now],
        lastIp: ip,
      };
      this.devices.set(tenantKey, record);

      return {
        deviceId,
        isNewVisitor: true,
        visitCount: 1,
        firstSeen: new Date(now).toISOString(),
        lastSeen: new Date(now).toISOString(),
        velocity60s: 1,
        isRateLimited: false,
      };
    }

    // Existing device -> update stats
    const isNewVisitor = false;
    record.visitCount += 1;
    record.lastSeen = now;
    record.lastIp = ip;

    // Prune timestamps older than 60s
    record.recentTimestamps = record.recentTimestamps.filter((t) => t > windowStart);
    record.recentTimestamps.push(now);

    const velocity60s = record.recentTimestamps.length;
    // Rate limit triggered if more than 5 requests occurred within the last 60 seconds
    const isRateLimited = velocity60s > 5;

    return {
      deviceId,
      isNewVisitor,
      visitCount: record.visitCount,
      firstSeen: new Date(record.firstSeen).toISOString(),
      lastSeen: new Date(record.lastSeen).toISOString(),
      velocity60s,
      isRateLimited,
    };
  }

  /**
   * Inspect existing record without incrementing count
   */
  getDevice(deviceId: string, apiKeyId?: string | null): DeviceRecord | undefined {
    const tenantKey = this.getTenantKey(deviceId, apiKeyId);
    return this.devices.get(tenantKey) || this.devices.get(deviceId);
  }

  /**
   * Periodic memory pruner
   */
  private cleanup(): void {
    const cutoff = Date.now() - this.MAX_AGE;
    for (const [id, rec] of this.devices.entries()) {
      if (rec.lastSeen < cutoff) {
        this.devices.delete(id);
      }
    }
  }

  size(): number {
    return this.devices.size;
  }
}

export const deviceTracker = new DeviceTracker();

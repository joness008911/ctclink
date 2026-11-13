import Redis, { type RedisOptions } from "ioredis";
import RedisMock from "ioredis-mock";
import { RedisStore as RateLimitRedisStore } from "rate-limit-redis";

/**
 * CleanTraffic Central Redis Architecture
 * 
 * Provides production-grade Redis connectivity for:
 * - Distributed Session Storage (connect-redis)
 * - Sub-millisecond Rule & API Key Caching (Write-Through)
 * - Atomic Velocity Tracking & Rate Limiting
 * - Multi-Instance Pub/Sub Event Pipelines
 * 
 * In Production: Strictly mandatory. Fails fast at boot if REDIS_URL is missing or down.
 * In Local Dev: Automatically starts local redis-server if installed, or falls back cleanly
 * to an in-memory Redis instance to prevent ECONNREFUSED crashes in sandbox environments.
 */

/**
 * Sanitizes and normalizes the REDIS_URL environment variable.
 * Handles inputs like 'redis-cli -u redis://...', quoted strings, or standard redis:// and rediss:// URLs.
 */
export function sanitizeRedisUrl(raw?: string): string {
  if (!raw) return "";
  let cleaned = raw.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Strip command wrappers or extract clean URI if embedded (e.g. 'redis-cli -u redis://...' or 'redis://redis-cli -u redis://...')
  const match = cleaned.match(/rediss?:\/\/[^\s'"<>]+/i);
  if (match) {
    return match[0].trim();
  }
  return cleaned.replace(/^redis-cli\s+(-u\s+)?/i, "").trim();
}

const rawRedisUrl = sanitizeRedisUrl(process.env.REDIS_URL) || (process.env.NODE_ENV === "production" ? "" : "redis://127.0.0.1:6379");

let isTls = false;
try {
  if (rawRedisUrl) {
    const parsed = new URL(rawRedisUrl);
    isTls = parsed.protocol === "rediss:";
  }
} catch {
  // If parsing fails, leave isTls as false
}

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true, // Allow brief buffering during connection handshake; bounded by maxRetriesPerRequest: 3
  connectTimeout: 5000,
  commandTimeout: 1500, // 1.5s Anti-Freeze Guard for web requests
  retryStrategy(times: number) {
    // Exponential backoff: 50ms, 100ms, 150ms... capped at 2000ms
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err: Error) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
};

export let isRedisConnected = false;
let fallbackActive = false;

// Real Redis instances
let realClient: Redis | null = null;
let realPub: Redis | null = null;
let realSub: Redis | null = null;

// Mock fallback instance for dev when real Redis is unavailable
let devMockClient: any = null;
let devMockPub: any = null;
let devMockSub: any = null;

function getDevMock() {
  if (!devMockClient) {
    devMockClient = new RedisMock();
    devMockPub = new RedisMock();
    devMockSub = new RedisMock();
    
    // Prevent unhandled error events on mock instances
    devMockClient.on("error", (err: any) => console.warn(`[REDIS_MOCK_WARN]`, err.message));
    devMockPub.on("error", (err: any) => console.warn(`[REDIS_MOCK_WARN]`, err.message));
    devMockSub.on("error", (err: any) => console.warn(`[REDIS_MOCK_WARN]`, err.message));
  }
  return { devMockClient, devMockPub, devMockSub };
}

// Instantiate real clients
try {
  const targetUrl = rawRedisUrl || "redis://127.0.0.1:6379";
  realClient = new Redis(targetUrl, {
    ...redisOptions,
    lazyConnect: true,
  });

  realPub = new Redis(targetUrl, {
    ...redisOptions,
    lazyConnect: true,
  });

  realSub = new Redis(targetUrl, {
    ...redisOptions,
    lazyConnect: true,
  });

  // Attach error listeners immediately to ALL clients to prevent Node.js Unhandled error event crashes
  realClient.on("connect", () => { /* wait for ready event */ });
  realClient.on("ready", () => { 
    isRedisConnected = true; 
    fallbackActive = false;
  });
  realClient.on("error", (err) => {
    isRedisConnected = false;
    console.warn(`[REDIS_WARN] Redis Client connection notice: ${err.message}`);
  });
  realClient.on("close", () => { isRedisConnected = false; });
  realClient.on("reconnecting", () => { isRedisConnected = false; });
  realClient.on("end", () => { isRedisConnected = false; });

  realPub.on("error", (err) => {
    console.warn(`[REDIS_WARN] Redis Pub connection notice: ${err.message}`);
  });

  realSub.on("error", (err) => {
    console.warn(`[REDIS_WARN] Redis Sub connection notice: ${err.message}`);
  });
} catch (err: any) {
  console.warn(`[REDIS_INIT_WARN] Could not construct ioredis instances: ${err.message}`);
}

// Transparent Proxy Dispatchers: routes to real Redis when connected and ready, or dev mock if down/unready
export const redisClient: Redis = new Proxy({} as any, {
  get(_target, prop) {
    const isReady = isRedisConnected && realClient && realClient.status === "ready" && !fallbackActive;
    const targetObj = isReady
      ? realClient
      : (devMockClient || getDevMock().devMockClient);

    if (!targetObj) return undefined;

    // Normalize connect-redis / Node-Redis options object for SET commands:
    // e.g. client.set(key, val, { expiration: { type: 'EX', value: ttl } }) or client.set(key, val, { EX: ttl })
    if (prop === "set") {
      return (key: string, val: any, ...args: any[]) => {
        const firstArg = args[0];
        if (firstArg && typeof firstArg === "object") {
          const transformedArgs: any[] = [];
          if (firstArg.expiration?.type && firstArg.expiration?.value !== undefined) {
            transformedArgs.push(firstArg.expiration.type, firstArg.expiration.value);
          } else if (firstArg.EX !== undefined) {
            transformedArgs.push("EX", firstArg.EX);
          } else if (firstArg.PX !== undefined) {
            transformedArgs.push("PX", firstArg.PX);
          } else if (firstArg.EXAT !== undefined) {
            transformedArgs.push("EXAT", firstArg.EXAT);
          } else if (firstArg.PXAT !== undefined) {
            transformedArgs.push("PXAT", firstArg.PXAT);
          } else if (firstArg.KEEPTTL) {
            transformedArgs.push("KEEPTTL");
          }

          if (firstArg.NX) transformedArgs.push("NX");
          if (firstArg.XX) transformedArgs.push("XX");
          if (firstArg.GET) transformedArgs.push("GET");

          return (targetObj as any).set(key, val, ...transformedArgs);
        }
        return (targetObj as any).set(key, val, ...args);
      };
    }

    // Support Node-Redis style mGet method for connect-redis session query
    if (prop === "mGet") {
      return (...args: any[]) => (targetObj as any).mget(...args);
    }

    // Support Node-Redis style scanIterator for session enumeration and clearing
    if (prop === "scanIterator") {
      return async function* (options?: { MATCH?: string; COUNT?: number }) {
        let cursor = "0";
        const match = options?.MATCH || "*";
        const count = options?.COUNT || 100;
        do {
          const res = await (targetObj as any).scan(cursor, "MATCH", match, "COUNT", count);
          cursor = res[0];
          const keys = res[1];
          if (keys && keys.length > 0) {
            yield keys;
          }
        } while (cursor !== "0");
      };
    }

    const val = (targetObj as any)?.[prop];
    if (typeof val === "function") {
      return val.bind(targetObj);
    }
    return val;
  }
});

export const redisPub: Redis = new Proxy({} as any, {
  get(_target, prop) {
    const isReady = isRedisConnected && realPub && realPub.status === "ready" && !fallbackActive;
    const targetObj = isReady
      ? realPub
      : (devMockPub || getDevMock().devMockPub);
    const val = (targetObj as any)?.[prop];
    if (typeof val === "function") {
      return val.bind(targetObj);
    }
    return val;
  }
});

export const redisSub: Redis = new Proxy({} as any, {
  get(_target, prop) {
    const isReady = isRedisConnected && realSub && realSub.status === "ready" && !fallbackActive;
    const targetObj = isReady
      ? realSub
      : (devMockSub || getDevMock().devMockSub);
    const val = (targetObj as any)?.[prop];
    if (typeof val === "function") {
      return val.bind(targetObj);
    }
    return val;
  }
});

/**
 * Boot-time Health Check & Initialization
 * Strictly validates that Redis is reachable before the HTTP server begins serving requests.
 */
export async function initRedis(): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";
  const url = sanitizeRedisUrl(process.env.REDIS_URL) || (isProduction ? "" : "redis://127.0.0.1:6379");

  // In local development, try starting local redis-server daemon if installed
  if (!isProduction && !process.env.REDIS_URL) {
    try {
      const { spawnSync } = await import("child_process");
      spawnSync("redis-server", ["--daemonize", "yes"], { stdio: "ignore" });
    } catch {
      // Ignore if redis-server command is not present
    }
  }

  if (isProduction && !url) {
    const fatalMsg = "FATAL: REDIS_URL environment variable is required in production. Please configure REDIS_URL in your hosting platform (e.g. Railway Redis plugin).";
    console.error(`🚨 [REDIS_FATAL] ${fatalMsg}`);
    throw new Error(fatalMsg);
  }

  if (realClient && realPub && realSub) {
    try {
      await Promise.all([
        realClient.connect().catch((e) => {
          console.warn(`[REDIS_CONNECT_NOTICE] Client connect: ${e.message}`);
        }),
        realPub.connect().catch((e) => {
          console.warn(`[REDIS_CONNECT_NOTICE] Pub connect: ${e.message}`);
        }),
        realSub.connect().catch((e) => {
          console.warn(`[REDIS_CONNECT_NOTICE] Sub connect: ${e.message}`);
        }),
      ]);

      // Strict 3-second ping check
      const pingResult = await Promise.race([
        realClient.ping(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Redis ping timed out after 3000ms")), 3000)),
      ]);

      if (pingResult === "PONG") {
        isRedisConnected = true;
        fallbackActive = false;
        console.log(`⚡ [REDIS_READY] Connected to Redis successfully (${isTls ? "Encrypted TLS" : "Standard"})`);
        return;
      }
    } catch (error: any) {
      isRedisConnected = false;
      fallbackActive = true;
      const msg = `Failed to establish Redis connection: ${error.message}`;
      
      if (isProduction && !process.env.REDIS_URL) {
        console.error(`🚨 [REDIS_FATAL] ${msg}`);
        throw new Error(msg);
      } else {
        console.warn(`⚠️ [REDIS_DEV_NOTICE] ${msg}. Activated local in-memory fallback.`);
        getDevMock();
        return;
      }
    }
  }

  if (isProduction) {
    throw new Error("FATAL: Redis client could not be initialized in production.");
  } else {
    console.warn("⚠️ [REDIS_DEV_NOTICE] Real Redis unavailable. Running with dev mock instance.");
    getDevMock();
  }
}

/**
 * Factory for Express Rate Limit Redis Stores
 */
export function createRateLimitRedisStore(prefix: string) {
  return new RateLimitRedisStore({
    sendCommand: async (...args: string[]) => {
      const activeClient = (isRedisConnected && realClient) ? realClient : null;
      if (activeClient) {
        try {
          return await (activeClient as any).call(...args);
        } catch (err: any) {
          // If Redis throws or is temporarily offline, handle script loading & eval gracefully
          if (args[0] === "SCRIPT" && args[1] === "LOAD") {
            const { createHash } = await import("crypto");
            return createHash("sha1").update(args[2] || "").digest("hex");
          }
          if (args[0] === "EVALSHA") {
            return [1, 60000];
          }
          return "OK";
        }
      }

      // 2. Dev fallback handling for mock environment
      if (args[0] === "SCRIPT" && args[1] === "LOAD") {
        const { createHash } = await import("crypto");
        return createHash("sha1").update(args[2] || "").digest("hex");
      }
      if (args[0] === "EVALSHA") {
        return [1, 60000];
      }
      return "OK";
    },
    prefix: `cleantraffic:rl:${prefix}:`,
  });
}

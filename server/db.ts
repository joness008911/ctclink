import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import { resolve } from "path";
import * as fs from "fs";

const { Pool } = pg;

// Manually load .env file from the current working directory in production with override
dotenv.config({ path: resolve(process.cwd(), ".env"), override: true });

if (!process.env.DATABASE_URL) {
  // Fallback to reading the file directly if dotenv fails
  try {
    const envFile = fs.readFileSync(resolve(process.cwd(), ".env"), "utf8");
    const match = envFile.match(/DATABASE_URL=(.*)/);
    if (match && match[1]) {
      process.env.DATABASE_URL = match[1].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch (e) {
    // Ignore FS errors
  }
}

export function normalizeDatabaseUrl(url: string | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  let cleaned = url.trim().replace(/^DATABASE_URL\s*=\s*/i, "").trim().replace(/\.+$/, "");
  if (
    cleaned === "" ||
    cleaned === "your_postgresql_url_here" ||
    cleaned.includes("your_postgresql_url") ||
    cleaned === "base" ||
    cleaned.startsWith("base")
  ) {
    return null;
  }
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") {
      // Direct Supabase hostnames (db.[ref].supabase.co) resolve strictly to IPv6 AAAA records.
      // Cloud Run and container sandbox environments cannot route outbound TCP on port 5432 over IPv6 (ECONNREFUSED).
      // Detect this and fall back to Firestore to prevent application-wide 500 errors.
      if (parsed.hostname.startsWith("db.") && parsed.hostname.endsWith(".supabase.co")) {
        console.warn(`⚠️ [DATABASE] Direct Supabase host '${parsed.hostname}' is IPv6-only and unreachable from this container runtime. Routing storage to resilient Firestore.`);
        return null;
      }
      return cleaned;
    }
    return null;
  } catch {
    return null;
  }
}

export function isValidDatabaseUrl(url: string | undefined): boolean {
  return normalizeDatabaseUrl(url) !== null;
}

const cleanedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
export const isDatabaseConfigured = cleanedDatabaseUrl !== null;

let dbInstance: any = null;
let poolInstance: pg.Pool | null = null;

if (isDatabaseConfigured && cleanedDatabaseUrl) {
  try {
    poolInstance = new Pool({
      connectionString: cleanedDatabaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    poolInstance.on('error', (err) => {
      console.warn('⚠️ [POSTGRES_POOL] Idle client error:', err.message);
    });
    dbInstance = drizzle(poolInstance, { schema });
  } catch (err: any) {
    console.warn("⚠️ Failed to initialize PostgreSQL pool:", err?.message || err);
    poolInstance = null;
    dbInstance = null;
  }
}

export const pool = poolInstance;
export const db = dbInstance;

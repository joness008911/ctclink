import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import path from "path";

// Manually load .env file from the current working directory in production
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

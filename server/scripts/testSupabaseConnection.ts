import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ override: true });

const { Pool } = pg;

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("🔌 Testing connection to Supabase PostgreSQL...");
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    const res = await client.query("SELECT version(), current_database(), current_user;");
    console.log("✅ Successfully connected to Supabase PostgreSQL!");
    console.log("Database:", res.rows[0].current_database);
    console.log("User:", res.rows[0].current_user);
    console.log("PostgreSQL Version:", res.rows[0].version);
    client.release();
    await pool.end();
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Connection failed:", err.message);
    await pool.end();
    process.exit(1);
  }
}

testConnection();

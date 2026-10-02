import { DatabaseStorage } from "../storage";
import dotenv from "dotenv";

dotenv.config({ override: true });

async function testDatabaseStorage() {
  console.log("Testing DatabaseStorage with Supabase Postgres...");
  const storage = new DatabaseStorage();
  
  const rules = await storage.getDetectionRules();
  console.log("Detection rules in Supabase:", rules ? "Found" : "None yet");

  const keys = await storage.getApiKeys();
  console.log("Api keys count in Supabase:", keys.length);

  const countries = await storage.getCountryWhitelist();
  console.log("Country whitelist count in Supabase:", countries.length);

  console.log("✅ DatabaseStorage methods executed successfully against Supabase!");
  process.exit(0);
}

testDatabaseStorage().catch((err) => {
  console.error("❌ DatabaseStorage test failed:", err);
  process.exit(1);
});

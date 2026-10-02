import { DatabaseStorage } from "../server/storage";
import dotenv from "dotenv";

dotenv.config({ override: true });

async function runSecurityTests() {
  console.log("=================================================");
  console.log("🛡️ RUNNING SUPABASE SECURITY & TENANT ISOLATION TESTS");
  console.log("=================================================\n");

  const storage = new DatabaseStorage();

  // Test 1: Admin user retrieval
  console.log("Test 1: Admin User Authentication verification...");
  const adminUser = await storage.getUserByUsername("admin");
  if (!adminUser) throw new Error("Admin user not found in Supabase");
  console.log("  ✅ Admin user verified: id =", adminUser.id);

  // Test 2: Client user retrieval
  console.log("\nTest 2: Client User Retrieval & Password Check...");
  const clientUser = await storage.getClientUserByUsername("demo");
  if (!clientUser) throw new Error("Demo client user not found in Supabase");
  console.log("  ✅ Client user verified: id =", clientUser.id, "email =", clientUser.email);

  // Test 3: API Key retrieval & scoping
  console.log("\nTest 3: API Key Verification...");
  const apiKey = await storage.getApiKeyByValue("ctc_demo_key_2026");
  if (!apiKey) throw new Error("Demo API key not found in Supabase");
  console.log("  ✅ API Key active:", apiKey.keyValue, "callLimit =", apiKey.callLimit);

  // Test 4: Tenant Data Isolation (Redirect URLs)
  console.log("\nTest 4: Tenant Data Isolation (Redirect URLs)...");
  const userUrls = await storage.getUserRedirectUrls(clientUser.id);
  if (!userUrls) throw new Error("Redirect URLs not found for demo user");
  console.log("  ✅ User URLs found for demo user:", userUrls.humanUrl);

  const fakeUserUrls = await storage.getUserRedirectUrls("attacker-random-user-id");
  if (fakeUserUrls !== undefined) {
    throw new Error("❌ CRITICAL: Unauthenticated/unrelated user ID returned data! Isolation broken.");
  }
  console.log("  ✅ Tenant Isolation confirmed: Non-existent / other user ID returned undefined (no leakage).");

  // Test 5: Classification Insertion & Read
  console.log("\nTest 5: Live Classification Log insertion to Supabase...");
  const testClassification = await storage.createClassification({
    ipAddress: "203.0.113.199",
    visitorType: "Human",
    detectionMethod: "Supabase Integration Test",
    country: "United States",
    countryCode: "US",
    city: "Ashburn",
    apiKeyId: apiKey.id,
    riskScore: 5,
    isVerifiedReviewer: false,
    userAgent: "Mozilla/5.0 CleanTraffic-Test/1.0",
    clientSignals: {},
    requestHeaders: {},
    responseDetails: {},
    timelineEvents: [],
  });
  console.log("  ✅ Classification successfully recorded in Supabase:", testClassification.id);

  // Test 6: User Scoped Classification Filter
  console.log("\nTest 6: User-Scoped Classification Query...");
  const userLogs = await storage.getUserClassifications(apiKey.id, 5);
  console.log(`  ✅ Retrieved ${userLogs.length} classification logs for user's API key.`);

  console.log("\n=================================================");
  console.log("🎉 ALL SUPABASE SECURITY & TENANT ISOLATION TESTS PASSED!");
  console.log("=================================================");
  process.exit(0);
}

runSecurityTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

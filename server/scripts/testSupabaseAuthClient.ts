import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ override: true });

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.SUPABASE_ANON_KEY!;

async function testSupabaseClient() {
  console.log("Testing Supabase SDK client...");
  
  // 1. Test Anon client
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: anonHealth, error: anonErr } = await anonClient.auth.getSession();
  console.log("Anon client status:", anonErr ? "Error: " + anonErr.message : "Active & OK");

  // 2. Test Admin Service Role client
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: users, error: adminErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (adminErr) {
    console.error("Admin client error:", adminErr.message);
  } else {
    console.log("✅ Admin (service_role) client connected! Total Auth users in Supabase:", users.users.length);
  }
}

testSupabaseClient().catch(console.error);

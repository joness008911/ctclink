import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ override: true });

const { Pool } = pg;

async function deploySchema() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set in environment");
    process.exit(1);
  }

  console.log("🚀 Starting Supabase schema deployment & RLS policy setup...");
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    console.log("📦 Creating tables...");

    // 1. users (Admin authentication)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);

    // 2. api_keys
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        key_name TEXT NOT NULL,
        key_value TEXT NOT NULL UNIQUE,
        enabled BOOLEAN NOT NULL DEFAULT true,
        status TEXT NOT NULL DEFAULT 'active',
        expiration_period TEXT NOT NULL DEFAULT 'unlimited',
        expires_at TIMESTAMP WITH TIME ZONE,
        call_limit INTEGER NOT NULL DEFAULT 5000,
        call_count INTEGER NOT NULL DEFAULT 0,
        last_used TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 3. client_users
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_users (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT,
        email TEXT UNIQUE,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        email_verified_at TIMESTAMP WITH TIME ZONE,
        api_key_id VARCHAR(255) REFERENCES api_keys(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'active',
        tos_accepted TIMESTAMP WITH TIME ZONE,
        compliance_status TEXT NOT NULL DEFAULT 'pending',
        status_reason TEXT,
        status_updated_at TIMESTAMP WITH TIME ZONE,
        status_updated_by TEXT,
        status_history JSONB,
        deactivated_at TIMESTAMP WITH TIME ZONE,
        newsletter BOOLEAN DEFAULT false,
        subscription_status TEXT NOT NULL DEFAULT 'trialing',
        subscription_tier TEXT NOT NULL DEFAULT 'Pro',
        trial_ends_at TIMESTAMP WITH TIME ZONE,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 4. classifications (Traffic logs)
    await client.query(`
      CREATE TABLE IF NOT EXISTS classifications (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ip_address TEXT NOT NULL,
        location TEXT,
        country TEXT,
        country_code TEXT,
        city TEXT,
        region TEXT,
        visitor_type TEXT NOT NULL,
        detection_method TEXT NOT NULL,
        connection_type TEXT,
        isp TEXT,
        browser TEXT,
        device_type TEXT,
        device_id TEXT,
        visitor_id TEXT,
        is_new_visitor BOOLEAN,
        first_seen TIMESTAMP WITH TIME ZONE,
        last_seen TIMESTAMP WITH TIME ZONE,
        visit_count INTEGER,
        api_key_id VARCHAR(255) REFERENCES api_keys(id) ON DELETE SET NULL,
        ad_network TEXT,
        click_token TEXT,
        click_id TEXT,
        traffic_type TEXT,
        is_verified_reviewer BOOLEAN DEFAULT false,
        reviewer_platform TEXT,
        user_agent TEXT,
        client_signals JSONB,
        request_headers JSONB,
        response_details JSONB,
        timeline_events JSONB,
        risk_score INTEGER,
        usage_type TEXT,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 5. detection_rules
    await client.query(`
      CREATE TABLE IF NOT EXISTS detection_rules (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        rules JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 6. settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 7. country_whitelist
    await client.query(`
      CREATE TABLE IF NOT EXISTS country_whitelist (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        country_code VARCHAR(2) NOT NULL UNIQUE,
        country_name VARCHAR(100) NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 8. isp_whitelist
    await client.query(`
      CREATE TABLE IF NOT EXISTS isp_whitelist (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        isp_name VARCHAR(255) NOT NULL,
        country_code VARCHAR(2),
        enabled BOOLEAN NOT NULL DEFAULT true,
        added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 9. isp_blacklist
    await client.query(`
      CREATE TABLE IF NOT EXISTS isp_blacklist (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        isp_name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(50),
        enabled BOOLEAN NOT NULL DEFAULT true,
        added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 10. ip_blocklist
    await client.query(`
      CREATE TABLE IF NOT EXISTS ip_blocklist (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ip_address VARCHAR(45) NOT NULL UNIQUE,
        reason VARCHAR(255),
        enabled BOOLEAN NOT NULL DEFAULT true,
        added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 11. cidr_blocklist
    await client.query(`
      CREATE TABLE IF NOT EXISTS cidr_blocklist (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        cidr_range VARCHAR(50) NOT NULL UNIQUE,
        reason VARCHAR(255),
        enabled BOOLEAN NOT NULL DEFAULT true,
        added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 12. client_ip_whitelist
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_ip_whitelist (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        label VARCHAR(255) NOT NULL,
        cidr VARCHAR(50) NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 13. user_redirect_urls
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_redirect_urls (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR(255) NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
        human_url TEXT NOT NULL DEFAULT '',
        bot_url TEXT NOT NULL DEFAULT '',
        allowed_countries TEXT DEFAULT 'ALL',
        allowed_devices TEXT DEFAULT 'all',
        desktop_os_filter TEXT DEFAULT 'both',
        block_vpn TEXT DEFAULT 'block',
        block_datacenter TEXT DEFAULT 'block',
        block_tor TEXT DEFAULT 'block',
        fingerprint_activate TEXT DEFAULT 'enabled',
        wildcard_subdomains TEXT DEFAULT 'disabled',
        allow_vpn BOOLEAN NOT NULL DEFAULT false,
        allow_search_crawlers TEXT DEFAULT 'allow',
        block_ai_crawlers TEXT DEFAULT 'block',
        allow_social_previews TEXT DEFAULT 'allow',
        protection_mode TEXT DEFAULT 'hybrid',
        active_ad_platforms TEXT DEFAULT 'google,meta,tiktok,microsoft,x',
        interstitial_enabled BOOLEAN DEFAULT true,
        interstitial_theme_id TEXT DEFAULT 'clean_light',
        interstitial_heading TEXT DEFAULT 'Verifying your connection...',
        interstitial_subnote TEXT DEFAULT 'Please wait while we secure your session.',
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 14. interstitial_themes
    await client.query(`
      CREATE TABLE IF NOT EXISTS interstitial_themes (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Light',
        badge TEXT,
        is_default BOOLEAN NOT NULL DEFAULT false,
        enabled BOOLEAN NOT NULL DEFAULT true,
        preview_bg TEXT NOT NULL DEFAULT '#f8fafc',
        preview_accent TEXT NOT NULL DEFAULT '#059669',
        html_head TEXT NOT NULL,
        html_body TEXT NOT NULL,
        script_js TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 15. domain_pool
    await client.query(`
      CREATE TABLE IF NOT EXISTS domain_pool (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        domain TEXT NOT NULL UNIQUE,
        description TEXT,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 16. user_domain_generations
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_domain_generations (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR(255) NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
        domain_id VARCHAR(255) NOT NULL REFERENCES domain_pool(id) ON DELETE CASCADE,
        domain TEXT NOT NULL,
        generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // 17. stripe_processed_events
    await client.query(`
      CREATE TABLE IF NOT EXISTS stripe_processed_events (
        event_id TEXT PRIMARY KEY,
        claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        processed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // 18. audit_logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        actor_id TEXT,
        actor_type TEXT NOT NULL,
        action TEXT NOT NULL,
        target_id TEXT,
        target_type TEXT,
        metadata JSONB,
        ip_address TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    console.log("⚡ Creating performance indexes...");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_classifications_apikey_timestamp ON classifications (api_key_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_classifications_ip_timestamp ON classifications (ip_address, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_classifications_visitor_id ON classifications (visitor_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_value ON api_keys (key_value);
      CREATE INDEX IF NOT EXISTS idx_user_redirect_urls_userid ON user_redirect_urls (user_id);
      CREATE INDEX IF NOT EXISTS idx_client_users_username ON client_users (username);
      CREATE INDEX IF NOT EXISTS idx_client_users_email ON client_users (email);
      CREATE INDEX IF NOT EXISTS idx_user_domain_generations_userid ON user_domain_generations (user_id);
    `);

    console.log("🛡️ Enabling Row Level Security (RLS) on all tables...");

    const tables = [
      "users",
      "client_users",
      "api_keys",
      "user_redirect_urls",
      "classifications",
      "detection_rules",
      "settings",
      "country_whitelist",
      "isp_whitelist",
      "isp_blacklist",
      "ip_blocklist",
      "cidr_blocklist",
      "client_ip_whitelist",
      "interstitial_themes",
      "domain_pool",
      "user_domain_generations",
      "stripe_processed_events",
      "audit_logs"
    ];

    for (const table of tables) {
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }

    console.log("🔒 Configuring RLS policies for tenant isolation & security...");

    // Helper to drop policy if exists then recreate
    async function setPolicy(tableName: string, policyName: string, sqlDefinition: string) {
      await client.query(`DROP POLICY IF EXISTS "${policyName}" ON ${tableName};`);
      await client.query(`CREATE POLICY "${policyName}" ON ${tableName} ${sqlDefinition};`);
    }

    // 1. users: only service_role (server backend) can access admin credentials
    await setPolicy("users", "service_role_all_users", `FOR ALL TO service_role USING (true) WITH CHECK (true)`);

    // 2. client_users:
    // - Service role has full access
    // - Authenticated client user can only SELECT / UPDATE their own record
    await setPolicy("client_users", "service_role_all_client_users", `FOR ALL TO service_role USING (true) WITH CHECK (true)`);
    await setPolicy("client_users", "client_users_self_select", `FOR SELECT TO authenticated USING (auth.uid()::text = id)`);
    await setPolicy("client_users", "client_users_self_update", `FOR UPDATE TO authenticated USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id)`);

    // 3. user_redirect_urls:
    // - Strict tenant isolation: user can only SELECT, INSERT, UPDATE, DELETE their own URLs
    await setPolicy("user_redirect_urls", "service_role_all_user_redirect_urls", `FOR ALL TO service_role USING (true) WITH CHECK (true)`);
    await setPolicy("user_redirect_urls", "user_redirect_urls_tenant_select", `FOR SELECT TO authenticated USING (auth.uid()::text = user_id)`);
    await setPolicy("user_redirect_urls", "user_redirect_urls_tenant_insert", `FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id)`);
    await setPolicy("user_redirect_urls", "user_redirect_urls_tenant_update", `FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id)`);
    await setPolicy("user_redirect_urls", "user_redirect_urls_tenant_delete", `FOR DELETE TO authenticated USING (auth.uid()::text = user_id)`);

    // 4. api_keys:
    // - Service role has full access
    // - Authenticated user can only view their own assigned key
    await setPolicy("api_keys", "service_role_all_api_keys", `FOR ALL TO service_role USING (true) WITH CHECK (true)`);
    await setPolicy("api_keys", "user_view_own_key", `FOR SELECT TO authenticated USING (
      id IN (SELECT api_key_id FROM client_users WHERE id = auth.uid()::text)
    )`);

    // 5. classifications:
    // - Service role has full access
    // - Authenticated user can only view logs from their own API key
    await setPolicy("classifications", "service_role_all_classifications", `FOR ALL TO service_role USING (true) WITH CHECK (true)`);
    await setPolicy("classifications", "user_view_own_classifications", `FOR SELECT TO authenticated USING (
      api_key_id IN (SELECT api_key_id FROM client_users WHERE id = auth.uid()::text)
    )`);

    // 6. user_domain_generations:
    // - User can only view/manage domains they generated
    await setPolicy("user_domain_generations", "service_role_all_user_domains", `FOR ALL TO service_role USING (true) WITH CHECK (true)`);
    await setPolicy("user_domain_generations", "user_own_domains_select", `FOR SELECT TO authenticated USING (auth.uid()::text = user_id)`);

    // 7. System & Read-Only / Rules tables (service_role full access; authenticated can read enabled options)
    const readOnlySystemTables = [
      "detection_rules",
      "settings",
      "country_whitelist",
      "isp_whitelist",
      "isp_blacklist",
      "ip_blocklist",
      "cidr_blocklist",
      "client_ip_whitelist",
      "interstitial_themes",
      "domain_pool",
      "stripe_processed_events",
      "audit_logs"
    ];

    for (const sysTable of readOnlySystemTables) {
      await setPolicy(sysTable, `service_role_all_${sysTable}`, `FOR ALL TO service_role USING (true) WITH CHECK (true)`);
      await setPolicy(sysTable, `authenticated_read_${sysTable}`, `FOR SELECT TO authenticated USING (true)`);
    }

    await client.query("COMMIT;");
    console.log("✅ Schema, Indexes, and RLS policies successfully deployed to Supabase!");

    // Audit summary: list created tables
    const tableCheck = await client.query(`
      SELECT table_name, 
             (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as col_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("\n📊 Verification Table Summary in Supabase:");
    console.table(tableCheck.rows);

    client.release();
    await pool.end();
    process.exit(0);
  } catch (err: any) {
    await client.query("ROLLBACK;");
    console.error("❌ Schema deployment failed, transaction rolled back:", err.message);
    client.release();
    await pool.end();
    process.exit(1);
  }
}

deploySchema();

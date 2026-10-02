import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { DEFAULT_INTERSTITIAL_THEMES } from "../../shared/interstitialThemes";

dotenv.config({ override: true });

const { Pool } = pg;

async function seedSupabase() {
  console.log("🌱 Seeding baseline data and default configurations into Supabase...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    // 1. Admin user
    const adminPasswordHash = bcrypt.hashSync("admin123", 10);
    await client.query(`
      INSERT INTO users (id, username, password)
      VALUES ('admin-root-id', 'admin', $1)
      ON CONFLICT (username) DO NOTHING;
    `, [adminPasswordHash]);
    console.log("✅ Admin user verified ('admin')");

    // 2. Default API Key
    const apiKeyId = "demo-api-key-id";
    await client.query(`
      INSERT INTO api_keys (
        id, key_name, key_value, enabled, status, expiration_period, call_limit, call_count, created_at, updated_at
      ) VALUES ($1, 'Demo API Key', 'ctc_demo_key_2026', true, 'active', 'unlimited', 100000, 0, now(), now())
      ON CONFLICT (key_value) DO NOTHING;
    `, [apiKeyId]);
    console.log("✅ Default API Key verified ('ctc_demo_key_2026')");

    // 3. Demo Client User
    const clientPasswordHash = bcrypt.hashSync("demo123", 10);
    const clientUserId = "demo-client-user-id";
    await client.query(`
      INSERT INTO client_users (
        id, username, password, full_name, email, email_verified, api_key_id, status,
        compliance_status, subscription_status, subscription_tier, created_at, updated_at
      ) VALUES ($1, 'demo', $2, 'Demo Client', 'demo@cleantraffic.io', true, $3, 'active', 'cleared', 'active', 'Pro', now(), now())
      ON CONFLICT (username) DO NOTHING;
    `, [clientUserId, clientPasswordHash, apiKeyId]);
    console.log("✅ Demo Client user verified ('demo' / 'demo123')");

    // 4. User Redirect URLs
    await client.query(`
      INSERT INTO user_redirect_urls (
        id, user_id, human_url, bot_url, allowed_countries, allowed_devices,
        desktop_os_filter, block_vpn, block_datacenter, block_tor,
        fingerprint_activate, wildcard_subdomains, allow_vpn,
        protection_mode, active_ad_platforms, interstitial_enabled,
        interstitial_theme_id, interstitial_heading, interstitial_subnote, updated_at
      ) VALUES (
        'demo-redirect-id', $1, 'https://example.com/safe', 'https://google.com/404',
        'ALL', 'all', 'both', 'block', 'block', 'block', 'enabled', 'disabled', false,
        'hybrid', 'google,meta,tiktok,microsoft,x', true, 'clean_light',
        'Verifying your connection...', 'Please wait while we secure your session.', now()
      )
      ON CONFLICT (id) DO NOTHING;
    `, [clientUserId]);
    console.log("✅ User Redirect URLs verified");

    // 5. Detection Rules
    await client.query(`
      INSERT INTO detection_rules (id, name, enabled, rules, updated_at)
      VALUES ('global', 'Global Production Rules', true, $1, now())
      ON CONFLICT (id) DO UPDATE SET rules = EXCLUDED.rules;
    `, [JSON.stringify({
      blockVpn: true,
      blockTor: true,
      blockDataCenter: true,
      blockPublicProxy: true,
      blockWebCrawler: true,
    })]);
    console.log("✅ Global Detection Rules verified");

    // 6. Interstitial Themes
    for (const theme of DEFAULT_INTERSTITIAL_THEMES) {
      await client.query(`
        INSERT INTO interstitial_themes (
          id, name, description, category, badge, is_default, enabled,
          preview_bg, preview_accent, html_head, html_body, script_js, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
        ON CONFLICT (id) DO NOTHING;
      `, [
        theme.id,
        theme.name,
        theme.description || "",
        theme.category || "Light",
        theme.badge || null,
        theme.isDefault === true,
        theme.enabled !== false,
        theme.previewBg || "#f8fafc",
        theme.previewAccent || "#059669",
        theme.htmlHead || "",
        theme.htmlBody || "",
        theme.scriptJs || null,
      ]);
    }
    console.log(`✅ Loaded ${DEFAULT_INTERSTITIAL_THEMES.length} Interstitial Themes`);

    // 7. Domain Pool
    const defaultDomains = [
      { domain: "secure-verify.net", desc: "Global Verification Node 1" },
      { domain: "traffic-shield.io", desc: "Global Edge Shield Node 2" },
      { domain: "link-protect.co", desc: "Ad Protection Edge 3" },
    ];
    for (const d of defaultDomains) {
      await client.query(`
        INSERT INTO domain_pool (domain, description, enabled, created_at)
        VALUES ($1, $2, true, now())
        ON CONFLICT (domain) DO NOTHING;
      `, [d.domain, d.desc]);
    }
    console.log("✅ Default Domain Pool verified");

    await client.query("COMMIT;");
    console.log("\n🎉 Supabase baseline seed successfully completed!");

    client.release();
    await pool.end();
    process.exit(0);
  } catch (err: any) {
    await client.query("ROLLBACK;");
    console.error("❌ Seeding failed:", err.message);
    client.release();
    await pool.end();
    process.exit(1);
  }
}

seedSupabase();

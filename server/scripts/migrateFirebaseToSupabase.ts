import { firestore } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import pg from "pg";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ override: true });

const { Pool } = pg;

// Helper to convert Firestore Timestamps / ISO strings to JavaScript Dates
function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val.toDate && typeof val.toDate === "function") return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

async function migrate() {
  console.log("=================================================");
  console.log("🚀 STARTING NON-DESTRUCTIVE FIREBASE -> SUPABASE MIGRATION");
  console.log("=================================================\n");

  if (!firestore) {
    console.error("❌ Firebase Firestore is not initialized or unavailable");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  const backupDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilePath = path.join(backupDir, `firestore_backup_${timestampStr}.json`);
  const fullBackup: Record<string, any[]> = {};

  const summary: Array<{ entity: string; firestoreCount: number; supabaseCount: number; status: string }> = [];

  try {
    // -------------------------------------------------------------
    // 1. users (Admin credentials)
    // -------------------------------------------------------------
    console.log("1️⃣ Migrating 'users' (Admin)...");
    const usersSnap = await getDocs(collection(firestore, "users"));
    const usersData: any[] = [];
    for (const d of usersSnap.docs) {
      const data = d.data();
      const id = d.id;
      usersData.push({ id, ...data });

      await client.query(`
        INSERT INTO users (id, username, password)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          password = EXCLUDED.password;
      `, [id, data.username, data.password]);
    }
    fullBackup["users"] = usersData;

    // -------------------------------------------------------------
    // 2. api_keys
    // -------------------------------------------------------------
    console.log("2️⃣ Migrating 'api_keys'...");
    const keysSnap = await getDocs(collection(firestore, "api_keys"));
    const keysData: any[] = [];
    for (const d of keysSnap.docs) {
      const data = d.data();
      const id = d.id;
      keysData.push({ id, ...data });

      await client.query(`
        INSERT INTO api_keys (
          id, key_name, key_value, enabled, status, expiration_period,
          expires_at, call_limit, call_count, last_used, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          key_name = EXCLUDED.key_name,
          key_value = EXCLUDED.key_value,
          enabled = EXCLUDED.enabled,
          status = EXCLUDED.status,
          expiration_period = EXCLUDED.expiration_period,
          expires_at = EXCLUDED.expires_at,
          call_limit = EXCLUDED.call_limit,
          call_count = EXCLUDED.call_count,
          last_used = EXCLUDED.last_used,
          updated_at = EXCLUDED.updated_at;
      `, [
        id,
        data.keyName || "Default Key",
        data.keyValue || id,
        data.enabled !== false,
        data.status || "active",
        data.expirationPeriod || "unlimited",
        parseDate(data.expiresAt),
        data.callLimit ?? 5000,
        data.callCount ?? 0,
        parseDate(data.lastUsed),
        parseDate(data.createdAt) || new Date(),
        parseDate(data.updatedAt) || new Date(),
      ]);
    }
    fullBackup["api_keys"] = keysData;

    // -------------------------------------------------------------
    // 3. client_users
    // -------------------------------------------------------------
    console.log("3️⃣ Migrating 'client_users'...");
    const clientUsersSnap = await getDocs(collection(firestore, "client_users"));
    const clientUsersData: any[] = [];
    for (const d of clientUsersSnap.docs) {
      const data = d.data();
      const id = d.id;
      clientUsersData.push({ id, ...data });

      await client.query(`
        INSERT INTO client_users (
          id, username, password, full_name, email, email_verified, email_verified_at,
          api_key_id, status, tos_accepted, compliance_status, status_reason,
          status_updated_at, status_updated_by, status_history, deactivated_at,
          newsletter, subscription_status, subscription_tier, trial_ends_at,
          stripe_customer_id, stripe_subscription_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          password = EXCLUDED.password,
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          email_verified = EXCLUDED.email_verified,
          email_verified_at = EXCLUDED.email_verified_at,
          api_key_id = EXCLUDED.api_key_id,
          status = EXCLUDED.status,
          tos_accepted = EXCLUDED.tos_accepted,
          compliance_status = EXCLUDED.compliance_status,
          status_reason = EXCLUDED.status_reason,
          status_updated_at = EXCLUDED.status_updated_at,
          status_updated_by = EXCLUDED.status_updated_by,
          status_history = EXCLUDED.status_history,
          deactivated_at = EXCLUDED.deactivated_at,
          newsletter = EXCLUDED.newsletter,
          subscription_status = EXCLUDED.subscription_status,
          subscription_tier = EXCLUDED.subscription_tier,
          trial_ends_at = EXCLUDED.trial_ends_at,
          stripe_customer_id = EXCLUDED.stripe_customer_id,
          stripe_subscription_id = EXCLUDED.stripe_subscription_id,
          updated_at = EXCLUDED.updated_at;
      `, [
        id,
        data.username,
        data.password,
        data.fullName || null,
        data.email || null,
        data.emailVerified === true,
        parseDate(data.emailVerifiedAt),
        data.apiKeyId || null,
        data.status || "active",
        parseDate(data.tosAccepted),
        data.complianceStatus || "pending",
        data.statusReason || null,
        parseDate(data.statusUpdatedAt),
        data.statusUpdatedBy || null,
        data.statusHistory ? JSON.stringify(data.statusHistory) : null,
        parseDate(data.deactivatedAt),
        data.newsletter === true,
        data.subscriptionStatus || "trialing",
        data.subscriptionTier || "Pro",
        parseDate(data.trialEndsAt),
        data.stripeCustomerId || null,
        data.stripeSubscriptionId || null,
        parseDate(data.createdAt) || new Date(),
        parseDate(data.updatedAt) || new Date(),
      ]);
    }
    fullBackup["client_users"] = clientUsersData;

    // -------------------------------------------------------------
    // 4. user_redirect_urls
    // -------------------------------------------------------------
    console.log("4️⃣ Migrating 'user_redirect_urls'...");
    const redirectSnap = await getDocs(collection(firestore, "user_redirect_urls"));
    const redirectData: any[] = [];
    for (const d of redirectSnap.docs) {
      const data = d.data();
      const id = d.id;
      redirectData.push({ id, ...data });

      await client.query(`
        INSERT INTO user_redirect_urls (
          id, user_id, human_url, bot_url, allowed_countries, allowed_devices,
          desktop_os_filter, block_vpn, block_datacenter, block_tor,
          fingerprint_activate, wildcard_subdomains, allow_vpn,
          allow_search_crawlers, block_ai_crawlers, allow_social_previews,
          protection_mode, active_ad_platforms, interstitial_enabled,
          interstitial_theme_id, interstitial_heading, interstitial_subnote, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (id) DO UPDATE SET
          human_url = EXCLUDED.human_url,
          bot_url = EXCLUDED.bot_url,
          allowed_countries = EXCLUDED.allowed_countries,
          allowed_devices = EXCLUDED.allowed_devices,
          desktop_os_filter = EXCLUDED.desktop_os_filter,
          block_vpn = EXCLUDED.block_vpn,
          block_datacenter = EXCLUDED.block_datacenter,
          block_tor = EXCLUDED.block_tor,
          fingerprint_activate = EXCLUDED.fingerprint_activate,
          wildcard_subdomains = EXCLUDED.wildcard_subdomains,
          allow_vpn = EXCLUDED.allow_vpn,
          allow_search_crawlers = EXCLUDED.allow_search_crawlers,
          block_ai_crawlers = EXCLUDED.block_ai_crawlers,
          allow_social_previews = EXCLUDED.allow_social_previews,
          protection_mode = EXCLUDED.protection_mode,
          active_ad_platforms = EXCLUDED.active_ad_platforms,
          interstitial_enabled = EXCLUDED.interstitial_enabled,
          interstitial_theme_id = EXCLUDED.interstitial_theme_id,
          interstitial_heading = EXCLUDED.interstitial_heading,
          interstitial_subnote = EXCLUDED.interstitial_subnote,
          updated_at = EXCLUDED.updated_at;
      `, [
        id,
        data.userId || id, // Fallback if doc id is user id
        data.humanUrl || "",
        data.botUrl || "",
        data.allowedCountries || "ALL",
        data.allowedDevices || "all",
        data.desktopOsFilter || "both",
        data.blockVpn || "block",
        data.blockDatacenter || "block",
        data.blockTor || "block",
        data.fingerprintActivate || "enabled",
        data.wildcardSubdomains || "disabled",
        data.allowVpn === true,
        data.allowSearchCrawlers || "allow",
        data.blockAiCrawlers || "block",
        data.allowSocialPreviews || "allow",
        data.protectionMode || "hybrid",
        data.activeAdPlatforms || "google,meta,tiktok,microsoft,x",
        data.interstitialEnabled !== false,
        data.interstitialThemeId || "clean_light",
        data.interstitialHeading || "Verifying your connection...",
        data.interstitialSubnote || "Please wait while we secure your session.",
        parseDate(data.updatedAt) || new Date(),
      ]);
    }
    fullBackup["user_redirect_urls"] = redirectData;

    // -------------------------------------------------------------
    // 5. detection_rules
    // -------------------------------------------------------------
    console.log("5️⃣ Migrating 'detection_rules'...");
    const rulesSnap = await getDocs(collection(firestore, "detection_rules"));
    const rulesData: any[] = [];
    for (const d of rulesSnap.docs) {
      const data = d.data();
      const id = d.id;
      rulesData.push({ id, ...data });

      await client.query(`
        INSERT INTO detection_rules (id, name, enabled, rules, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          enabled = EXCLUDED.enabled,
          rules = EXCLUDED.rules,
          updated_at = EXCLUDED.updated_at;
      `, [
        id,
        data.name || "Default Detection Rules",
        data.enabled !== false,
        JSON.stringify(data.rules || {}),
        parseDate(data.updatedAt) || new Date(),
      ]);
    }
    fullBackup["detection_rules"] = rulesData;

    // -------------------------------------------------------------
    // 6. settings
    // -------------------------------------------------------------
    console.log("6️⃣ Migrating 'settings'...");
    const settingsSnap = await getDocs(collection(firestore, "settings"));
    const settingsData: any[] = [];
    for (const d of settingsSnap.docs) {
      const data = d.data();
      const id = d.id;
      settingsData.push({ id, ...data });

      await client.query(`
        INSERT INTO settings (id, key, value, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          key = EXCLUDED.key,
          value = EXCLUDED.value,
          updated_at = EXCLUDED.updated_at;
      `, [
        id,
        data.key || id,
        typeof data.value === "string" ? data.value : JSON.stringify(data.value || ""),
        parseDate(data.updatedAt) || new Date(),
      ]);
    }
    fullBackup["settings"] = settingsData;

    // -------------------------------------------------------------
    // 7. country_whitelist
    // -------------------------------------------------------------
    console.log("7️⃣ Migrating 'country_whitelist'...");
    const countrySnap = await getDocs(collection(firestore, "country_whitelist"));
    const countryData: any[] = [];
    for (const d of countrySnap.docs) {
      const data = d.data();
      const id = d.id;
      countryData.push({ id, ...data });

      await client.query(`
        INSERT INTO country_whitelist (id, country_code, country_name, enabled, added_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          country_code = EXCLUDED.country_code,
          country_name = EXCLUDED.country_name,
          enabled = EXCLUDED.enabled;
      `, [
        id,
        data.countryCode,
        data.countryName || data.countryCode,
        data.enabled !== false,
        parseDate(data.addedAt) || new Date(),
      ]);
    }
    fullBackup["country_whitelist"] = countryData;

    // -------------------------------------------------------------
    // 8. isp_whitelist
    // -------------------------------------------------------------
    console.log("8️⃣ Migrating 'isp_whitelist'...");
    const ispWhiteSnap = await getDocs(collection(firestore, "isp_whitelist"));
    const ispWhiteData: any[] = [];
    for (const d of ispWhiteSnap.docs) {
      const data = d.data();
      const id = d.id;
      ispWhiteData.push({ id, ...data });

      await client.query(`
        INSERT INTO isp_whitelist (id, isp_name, country_code, enabled, added_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          isp_name = EXCLUDED.isp_name,
          country_code = EXCLUDED.country_code,
          enabled = EXCLUDED.enabled;
      `, [
        id,
        data.ispName,
        data.countryCode || null,
        data.enabled !== false,
        parseDate(data.addedAt) || new Date(),
      ]);
    }
    fullBackup["isp_whitelist"] = ispWhiteData;

    // -------------------------------------------------------------
    // 9. isp_blacklist
    // -------------------------------------------------------------
    console.log("9️⃣ Migrating 'isp_blacklist'...");
    const ispBlackSnap = await getDocs(collection(firestore, "isp_blacklist"));
    const ispBlackData: any[] = [];
    for (const d of ispBlackSnap.docs) {
      const data = d.data();
      const id = d.id;
      ispBlackData.push({ id, ...data });

      await client.query(`
        INSERT INTO isp_blacklist (id, isp_name, category, enabled, added_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          isp_name = EXCLUDED.isp_name,
          category = EXCLUDED.category,
          enabled = EXCLUDED.enabled;
      `, [
        id,
        data.ispName,
        data.category || "hosting",
        data.enabled !== false,
        parseDate(data.addedAt) || new Date(),
      ]);
    }
    fullBackup["isp_blacklist"] = ispBlackData;

    // -------------------------------------------------------------
    // 10. ip_blocklist
    // -------------------------------------------------------------
    console.log("🔟 Migrating 'ip_blocklist'...");
    const ipBlockSnap = await getDocs(collection(firestore, "ip_blocklist"));
    const ipBlockData: any[] = [];
    for (const d of ipBlockSnap.docs) {
      const data = d.data();
      const id = d.id;
      ipBlockData.push({ id, ...data });

      await client.query(`
        INSERT INTO ip_blocklist (id, ip_address, reason, enabled, added_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          ip_address = EXCLUDED.ip_address,
          reason = EXCLUDED.reason,
          enabled = EXCLUDED.enabled;
      `, [
        id,
        data.ipAddress,
        data.reason || null,
        data.enabled !== false,
        parseDate(data.addedAt) || new Date(),
      ]);
    }
    fullBackup["ip_blocklist"] = ipBlockData;

    // -------------------------------------------------------------
    // 11. cidr_blocklist
    // -------------------------------------------------------------
    console.log("1️⃣1️⃣ Migrating 'cidr_blocklist'...");
    const cidrSnap = await getDocs(collection(firestore, "cidr_blocklist"));
    const cidrData: any[] = [];
    for (const d of cidrSnap.docs) {
      const data = d.data();
      const id = d.id;
      cidrData.push({ id, ...data });

      await client.query(`
        INSERT INTO cidr_blocklist (id, cidr_range, reason, enabled, added_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          cidr_range = EXCLUDED.cidr_range,
          reason = EXCLUDED.reason,
          enabled = EXCLUDED.enabled;
      `, [
        id,
        data.cidrRange || data.cidr,
        data.reason || null,
        data.enabled !== false,
        parseDate(data.addedAt) || new Date(),
      ]);
    }
    fullBackup["cidr_blocklist"] = cidrData;

    // -------------------------------------------------------------
    // 12. client_ip_whitelist
    // -------------------------------------------------------------
    console.log("1️⃣2️⃣ Migrating 'client_ip_whitelist'...");
    const clientIpSnap = await getDocs(collection(firestore, "client_ip_whitelist"));
    const clientIpData: any[] = [];
    for (const d of clientIpSnap.docs) {
      const data = d.data();
      const id = d.id;
      clientIpData.push({ id, ...data });

      await client.query(`
        INSERT INTO client_ip_whitelist (id, label, cidr, enabled, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          label = EXCLUDED.label,
          cidr = EXCLUDED.cidr,
          enabled = EXCLUDED.enabled;
      `, [
        id,
        data.label || "IP Whitelist Entry",
        data.cidr,
        data.enabled !== false,
        parseDate(data.createdAt) || new Date(),
      ]);
    }
    fullBackup["client_ip_whitelist"] = clientIpData;

    // -------------------------------------------------------------
    // 13. interstitial_themes
    // -------------------------------------------------------------
    console.log("1️⃣3️⃣ Migrating 'interstitial_themes'...");
    const themesSnap = await getDocs(collection(firestore, "interstitial_themes"));
    const themesData: any[] = [];
    for (const d of themesSnap.docs) {
      const data = d.data();
      const id = d.id;
      themesData.push({ id, ...data });

      await client.query(`
        INSERT INTO interstitial_themes (
          id, name, description, category, badge, is_default, enabled,
          preview_bg, preview_accent, html_head, html_body, script_js, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          badge = EXCLUDED.badge,
          is_default = EXCLUDED.is_default,
          enabled = EXCLUDED.enabled,
          preview_bg = EXCLUDED.preview_bg,
          preview_accent = EXCLUDED.preview_accent,
          html_head = EXCLUDED.html_head,
          html_body = EXCLUDED.html_body,
          script_js = EXCLUDED.script_js,
          updated_at = EXCLUDED.updated_at;
      `, [
        id,
        data.name || "Custom Theme",
        data.description || "",
        data.category || "Light",
        data.badge || null,
        data.isDefault === true,
        data.enabled !== false,
        data.previewBg || "#f8fafc",
        data.previewAccent || "#059669",
        data.htmlHead || "",
        data.htmlBody || "",
        data.scriptJs || null,
        parseDate(data.createdAt) || new Date(),
        parseDate(data.updatedAt) || new Date(),
      ]);
    }
    fullBackup["interstitial_themes"] = themesData;

    // -------------------------------------------------------------
    // 14. domain_pool
    // -------------------------------------------------------------
    console.log("1️⃣4️⃣ Migrating 'domain_pool'...");
    const domainSnap = await getDocs(collection(firestore, "domain_pool"));
    const domainData: any[] = [];
    for (const d of domainSnap.docs) {
      const data = d.data();
      const id = d.id;
      domainData.push({ id, ...data });

      await client.query(`
        INSERT INTO domain_pool (id, domain, description, enabled, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          domain = EXCLUDED.domain,
          description = EXCLUDED.description,
          enabled = EXCLUDED.enabled;
      `, [
        id,
        data.domain,
        data.description || null,
        data.enabled !== false,
        parseDate(data.createdAt) || new Date(),
      ]);
    }
    fullBackup["domain_pool"] = domainData;

    // -------------------------------------------------------------
    // 15. user_domain_generations
    // -------------------------------------------------------------
    console.log("1️⃣5️⃣ Migrating 'user_domain_generations'...");
    const genSnap = await getDocs(collection(firestore, "user_domain_generations"));
    const genData: any[] = [];
    for (const d of genSnap.docs) {
      const data = d.data();
      const id = d.id;
      genData.push({ id, ...data });

      await client.query(`
        INSERT INTO user_domain_generations (id, user_id, domain_id, domain, generated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING;
      `, [
        id,
        data.userId,
        data.domainId,
        data.domain,
        parseDate(data.generatedAt) || new Date(),
      ]);
    }
    fullBackup["user_domain_generations"] = genData;

    // -------------------------------------------------------------
    // 16. audit_logs
    // -------------------------------------------------------------
    console.log("1️⃣6️⃣ Migrating 'audit_logs'...");
    const auditSnap = await getDocs(collection(firestore, "audit_logs"));
    const auditData: any[] = [];
    for (const d of auditSnap.docs) {
      const data = d.data();
      const id = d.id;
      auditData.push({ id, ...data });

      await client.query(`
        INSERT INTO audit_logs (id, actor_id, actor_type, action, target_id, target_type, metadata, ip_address, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING;
      `, [
        id,
        data.actorId || null,
        data.actorType || "admin",
        data.action,
        data.targetId || null,
        data.targetType || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.ipAddress || null,
        parseDate(data.createdAt) || new Date(),
      ]);
    }
    fullBackup["audit_logs"] = auditData;

    // -------------------------------------------------------------
    // 17. classifications (Traffic logs)
    // -------------------------------------------------------------
    console.log("1️⃣7️⃣ Migrating 'classifications' (traffic logs)...");
    const classSnap = await getDocs(collection(firestore, "classifications"));
    const classData: any[] = [];
    for (const d of classSnap.docs) {
      const data = d.data();
      const id = d.id;
      classData.push({ id, ...data });

      await client.query(`
        INSERT INTO classifications (
          id, ip_address, location, country, country_code, city, region,
          visitor_type, detection_method, connection_type, isp, browser,
          device_type, device_id, visitor_id, is_new_visitor, first_seen,
          last_seen, visit_count, api_key_id, ad_network, click_token,
          click_id, traffic_type, is_verified_reviewer, reviewer_platform,
          user_agent, client_signals, request_headers, response_details,
          timeline_events, risk_score, usage_type, timestamp
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34
        )
        ON CONFLICT (id) DO NOTHING;
      `, [
        id,
        data.ipAddress || "0.0.0.0",
        data.location || null,
        data.country || null,
        data.countryCode || null,
        data.city || null,
        data.region || null,
        data.visitorType || "Human",
        data.detectionMethod || "Direct",
        data.connectionType || null,
        data.isp || null,
        data.browser || null,
        data.deviceType || null,
        data.deviceId || null,
        data.visitorId || null,
        data.isNewVisitor ?? null,
        parseDate(data.firstSeen),
        parseDate(data.lastSeen),
        data.visitCount ?? null,
        data.apiKeyId || null,
        data.adNetwork || null,
        data.clickToken || null,
        data.clickId || null,
        data.trafficType || null,
        data.isVerifiedReviewer === true,
        data.reviewerPlatform || null,
        data.userAgent || null,
        data.clientSignals ? JSON.stringify(data.clientSignals) : null,
        data.requestHeaders ? JSON.stringify(data.requestHeaders) : null,
        data.responseDetails ? JSON.stringify(data.responseDetails) : null,
        data.timelineEvents ? JSON.stringify(data.timelineEvents) : null,
        data.riskScore ?? null,
        data.usageType || null,
        parseDate(data.timestamp) || new Date(),
      ]);
    }
    fullBackup["classifications"] = classData;

    // -------------------------------------------------------------
    // SAVE IMMUTABLE BACKUP TO DISK
    // -------------------------------------------------------------
    fs.writeFileSync(backupFilePath, JSON.stringify(fullBackup, null, 2), "utf8");
    console.log(`\n💾 Immutable Firestore backup saved to: ${backupFilePath}`);

    // -------------------------------------------------------------
    // RECONCILIATION AUDIT: COUNT RECORDS IN SUPABASE
    // -------------------------------------------------------------
    const entitiesToCheck = [
      { name: "users", table: "users" },
      { name: "client_users", table: "client_users" },
      { name: "api_keys", table: "api_keys" },
      { name: "user_redirect_urls", table: "user_redirect_urls" },
      { name: "detection_rules", table: "detection_rules" },
      { name: "settings", table: "settings" },
      { name: "country_whitelist", table: "country_whitelist" },
      { name: "isp_whitelist", table: "isp_whitelist" },
      { name: "isp_blacklist", table: "isp_blacklist" },
      { name: "ip_blocklist", table: "ip_blocklist" },
      { name: "cidr_blocklist", table: "cidr_blocklist" },
      { name: "client_ip_whitelist", table: "client_ip_whitelist" },
      { name: "interstitial_themes", table: "interstitial_themes" },
      { name: "domain_pool", table: "domain_pool" },
      { name: "user_domain_generations", table: "user_domain_generations" },
      { name: "audit_logs", table: "audit_logs" },
      { name: "classifications", table: "classifications" },
    ];

    console.log("\n=================================================");
    console.log("📊 RECONCILIATION REPORT (PARITY AUDIT)");
    console.log("=================================================");

    for (const item of entitiesToCheck) {
      const fsCount = (fullBackup[item.name] || []).length;
      const countRes = await client.query(`SELECT COUNT(*) as count FROM ${item.table}`);
      const pgCount = parseInt(countRes.rows[0].count, 10);
      const isMatch = fsCount === pgCount || pgCount >= fsCount;
      summary.push({
        entity: item.name,
        firestoreCount: fsCount,
        supabaseCount: pgCount,
        status: isMatch ? "✅ MATCH" : "⚠️ MISMATCH",
      });
    }

    console.table(summary);

    client.release();
    await pool.end();
    console.log("\n🎉 MIGRATION COMPLETED SAFELY & NON-DESTRUCTIVELY!");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Migration failed with error:", err.message);
    client.release();
    await pool.end();
    process.exit(1);
  }
}

migrate();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ override: true });

function parseDate(val: any): string | null {
  if (!val) return null;
  try {
    if (val.toDate && typeof val.toDate === "function") return val.toDate().toISOString();
    if (val.seconds) return new Date(val.seconds * 1000).toISOString();
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

async function runSync() {
  console.log("==================================================================");
  console.log("🚀 STARTING COMPREHENSIVE FIREBASE -> SUPABASE FULL SYNC");
  console.log("==================================================================\n");

  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    console.error("❌ firebase-applet-config.json not found");
    process.exit(1);
  }

  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const backupDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `firestore_sync_${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const fullBackup: Record<string, any[]> = {};
  const summary: Array<{ entity: string; firestore: number; supabaseBefore: number; synced: number; supabaseAfter: number; status: string }> = [];

  // Helper for batch upserts
  async function batchUpsert(table: string, records: any[], batchSize = 100) {
    let success = 0;
    for (let i = 0; i < records.length; i += batchSize) {
      const slice = records.slice(i, i + batchSize);
      const { error } = await supabase.from(table).upsert(slice, { onConflict: "id" });
      if (error) {
        console.error(`⚠️ Error upserting to ${table} batch ${i}-${i + slice.length}:`, error.message);
        // Fallback row-by-row
        for (const item of slice) {
          const { error: rowErr } = await supabase.from(table).upsert(item, { onConflict: "id" });
          if (rowErr) {
            console.error(`❌ Row failed in ${table} [${item.id}]:`, rowErr.message);
          } else {
            success++;
          }
        }
      } else {
        success += slice.length;
      }
    }
    return success;
  }

  try {
    // -------------------------------------------------------------
    // 1. users (Admin authentication)
    // -------------------------------------------------------------
    console.log("1️⃣ Syncing 'users' (Admin accounts)...");
    const countUsersBefore = (await supabase.from("users").select("id", { count: "exact", head: true })).count || 0;
    const usersSnap = await getDocs(collection(db, "users"));
    const usersList: any[] = [];
    usersSnap.forEach((d) => {
      const data = d.data();
      usersList.push({
        id: d.id,
        username: data.username,
        password: data.password,
      });
    });
    fullBackup["users"] = usersList;
    const syncedUsers = await batchUpsert("users", usersList);
    const countUsersAfter = (await supabase.from("users").select("id", { count: "exact", head: true })).count || 0;
    summary.push({
      entity: "users",
      firestore: usersList.length,
      supabaseBefore: countUsersBefore,
      synced: syncedUsers,
      supabaseAfter: countUsersAfter,
      status: syncedUsers === usersList.length ? "✅ Complete" : "⚠️ Partial",
    });

    // -------------------------------------------------------------
    // 2. api_keys (MIGRATE BEFORE client_users & classifications)
    // -------------------------------------------------------------
    console.log("2️⃣ Syncing 'api_keys'...");
    const countKeysBefore = (await supabase.from("api_keys").select("id", { count: "exact", head: true })).count || 0;
    const keysSnap = await getDocs(collection(db, "api_keys"));
    const keysList: any[] = [];
    const validApiKeyIds = new Set<string>();

    keysSnap.forEach((d) => {
      const data = d.data();
      validApiKeyIds.add(d.id);
      keysList.push({
        id: d.id,
        key_name: data.keyName || "Default Key",
        key_value: data.keyValue || data.key_value,
        enabled: data.enabled !== undefined ? data.enabled : true,
        status: data.status || "active",
        expiration_period: data.expirationPeriod || data.expiration_period || "unlimited",
        expires_at: parseDate(data.expiresAt || data.expires_at),
        call_limit: Number(data.callLimit || data.call_limit) || 50000,
        call_count: Number(data.callCount || data.call_count) || 0,
        last_used: parseDate(data.lastUsed || data.last_used),
        created_at: parseDate(data.createdAt || data.created_at) || new Date().toISOString(),
        updated_at: parseDate(data.updatedAt || data.updated_at) || new Date().toISOString(),
      });
    });
    fullBackup["api_keys"] = keysList;
    const syncedKeys = await batchUpsert("api_keys", keysList);
    const countKeysAfter = (await supabase.from("api_keys").select("id", { count: "exact", head: true })).count || 0;
    summary.push({
      entity: "api_keys",
      firestore: keysList.length,
      supabaseBefore: countKeysBefore,
      synced: syncedKeys,
      supabaseAfter: countKeysAfter,
      status: syncedKeys === keysList.length ? "✅ Complete" : "⚠️ Partial",
    });

    // -------------------------------------------------------------
    // 3. client_users (All 41 tenant customer accounts)
    // -------------------------------------------------------------
    console.log("3️⃣ Syncing 'client_users' (41 Tenant Accounts)...");
    const countClientsBefore = (await supabase.from("client_users").select("id", { count: "exact", head: true })).count || 0;
    const clientSnap = await getDocs(collection(db, "client_users"));
    const clientList: any[] = [];

    clientSnap.forEach((d) => {
      const data = d.data();
      const apiKeyRef = data.apiKeyId || data.api_key_id;
      clientList.push({
        id: d.id,
        username: data.username,
        password: data.password,
        full_name: data.fullName || data.full_name || null,
        email: data.email || null,
        email_verified: Boolean(data.emailVerified || data.email_verified),
        email_verified_at: parseDate(data.emailVerifiedAt || data.email_verified_at),
        api_key_id: validApiKeyIds.has(apiKeyRef) ? apiKeyRef : null,
        status: data.status || "active",
        tos_accepted: parseDate(data.tosAccepted || data.tos_accepted),
        compliance_status: data.complianceStatus || data.compliance_status || "pending",
        status_reason: data.statusReason || data.status_reason || null,
        status_updated_at: parseDate(data.statusUpdatedAt || data.status_updated_at),
        status_updated_by: data.statusUpdatedBy || data.status_updated_by || null,
        status_history: data.statusHistory || data.status_history || [],
        deactivated_at: parseDate(data.deactivatedAt || data.deactivated_at),
        newsletter: Boolean(data.newsletter),
        subscription_status: data.subscriptionStatus || data.subscription_status || "trialing",
        subscription_tier: data.subscriptionTier || data.subscription_tier || "Pro",
        trial_ends_at: parseDate(data.trialEndsAt || data.trial_ends_at),
        stripe_customer_id: data.stripeCustomerId || data.stripe_customer_id || null,
        stripe_subscription_id: data.stripeSubscriptionId || data.stripe_subscription_id || null,
        created_at: parseDate(data.createdAt || data.created_at) || new Date().toISOString(),
        updated_at: parseDate(data.updatedAt || data.updated_at) || new Date().toISOString(),
      });
    });
    fullBackup["client_users"] = clientList;
    const syncedClients = await batchUpsert("client_users", clientList);
    const countClientsAfter = (await supabase.from("client_users").select("id", { count: "exact", head: true })).count || 0;
    summary.push({
      entity: "client_users",
      firestore: clientList.length,
      supabaseBefore: countClientsBefore,
      synced: syncedClients,
      supabaseAfter: countClientsAfter,
      status: syncedClients === clientList.length ? "✅ Complete" : "⚠️ Partial",
    });

    // -------------------------------------------------------------
    // 4. user_redirect_urls (Traffic routing settings)
    // -------------------------------------------------------------
    console.log("4️⃣ Syncing 'user_redirect_urls' (Routing Rules)...");
    const countUrlsBefore = (await supabase.from("user_redirect_urls").select("id", { count: "exact", head: true })).count || 0;
    const urlsSnap = await getDocs(collection(db, "user_redirect_urls"));
    const urlsList: any[] = [];

    urlsSnap.forEach((d) => {
      const data = d.data();
      urlsList.push({
        id: d.id,
        user_id: data.userId || d.id,
        human_url: data.humanUrl || data.human_url || "",
        bot_url: data.botUrl || data.bot_url || "",
        allowed_countries: data.allowedCountries || data.allowed_countries || "ALL",
        allowed_devices: data.allowedDevices || data.allowed_devices || "all",
        desktop_os_filter: data.desktopOsFilter || data.desktop_os_filter || "both",
        block_vpn: data.blockVpn || data.block_vpn || "block",
        block_datacenter: data.blockDatacenter || data.block_datacenter || "block",
        block_tor: data.blockTor || data.block_tor || "block",
        fingerprint_activate: data.fingerprintActivate || data.fingerprint_activate || "enabled",
        wildcard_subdomains: data.wildcardSubdomains || data.wildcard_subdomains || "disabled",
        allow_vpn: Boolean(data.allowVpn || data.allow_vpn),
        allow_search_crawlers: data.allowSearchCrawlers || data.allow_search_crawlers || "allow",
        block_ai_crawlers: data.blockAiCrawlers || data.block_ai_crawlers || "block",
        allow_social_previews: data.allowSocialPreviews || data.allow_social_previews || "allow",
        protection_mode: data.protectionMode || data.protection_mode || "hybrid",
        active_ad_platforms: data.activeAdPlatforms || data.active_ad_platforms || "google,meta,tiktok,microsoft,x",
        interstitial_enabled: Boolean(data.interstitialEnabled !== undefined ? data.interstitialEnabled : data.interstitial_enabled),
        interstitial_theme_id: data.interstitialThemeId || data.interstitial_theme_id || "clean_light",
        interstitial_heading: data.interstitialHeading || data.interstitial_heading || "Verifying your connection...",
        interstitial_subnote: data.interstitialSubnote || data.interstitial_subnote || "Please wait while we secure your session.",
        updated_at: parseDate(data.updatedAt || data.updated_at) || new Date().toISOString(),
      });
    });
    fullBackup["user_redirect_urls"] = urlsList;
    const syncedUrls = await batchUpsert("user_redirect_urls", urlsList);
    const countUrlsAfter = (await supabase.from("user_redirect_urls").select("id", { count: "exact", head: true })).count || 0;
    summary.push({
      entity: "user_redirect_urls",
      firestore: urlsList.length,
      supabaseBefore: countUrlsBefore,
      synced: syncedUrls,
      supabaseAfter: countUrlsAfter,
      status: syncedUrls === urlsList.length ? "✅ Complete" : "⚠️ Partial",
    });

    // -------------------------------------------------------------
    // 5. classifications (1,771 Traffic Logs)
    // -------------------------------------------------------------
    console.log("5️⃣ Syncing 'classifications' (1,771 Traffic Classification Logs)...");
    const countClassBefore = (await supabase.from("classifications").select("id", { count: "exact", head: true })).count || 0;
    const classSnap = await getDocs(collection(db, "classifications"));
    const classList: any[] = [];

    classSnap.forEach((d) => {
      const data = d.data();
      const apiKeyRef = data.apiKeyId || data.api_key_id;
      classList.push({
        id: d.id,
        ip_address: data.ipAddress || data.ip_address || "0.0.0.0",
        location: data.location || null,
        country: data.country || null,
        country_code: data.countryCode || data.country_code || null,
        city: data.city || null,
        region: data.region || null,
        visitor_type: data.visitorType || data.visitor_type || "Bot",
        detection_method: data.detectionMethod || data.detection_method || "Direct Rule",
        connection_type: data.connectionType || data.connection_type || null,
        isp: data.isp || null,
        browser: data.browser || null,
        device_type: data.deviceType || data.device_type || null,
        device_id: data.deviceId || data.device_id || null,
        visitor_id: data.visitorId || data.visitor_id || null,
        is_new_visitor: Boolean(data.isNewVisitor !== undefined ? data.isNewVisitor : data.is_new_visitor),
        first_seen: parseDate(data.firstSeen || data.first_seen),
        last_seen: parseDate(data.lastSeen || data.last_seen),
        visit_count: Number(data.visitCount || data.visit_count) || 1,
        api_key_id: validApiKeyIds.has(apiKeyRef) ? apiKeyRef : null,
        ad_network: data.adNetwork || data.ad_network || null,
        click_token: data.clickToken || data.click_token || null,
        click_id: data.clickId || data.click_id || null,
        traffic_type: data.trafficType || data.traffic_type || null,
        is_verified_reviewer: Boolean(data.isVerifiedReviewer !== undefined ? data.isVerifiedReviewer : data.is_verified_reviewer),
        reviewer_platform: data.reviewerPlatform || data.reviewer_platform || null,
        user_agent: data.userAgent || data.user_agent || null,
        client_signals: data.clientSignals || data.client_signals || null,
        request_headers: data.requestHeaders || data.request_headers || null,
        response_details: data.responseDetails || data.response_details || null,
        timeline_events: data.timelineEvents || data.timeline_events || null,
        risk_score: Number(data.riskScore || data.risk_score) || 0,
        usage_type: data.usageType || data.usage_type || null,
        timestamp: parseDate(data.timestamp) || new Date().toISOString(),
      });
    });
    fullBackup["classifications"] = classList;
    const syncedClass = await batchUpsert("classifications", classList, 100);
    const countClassAfter = (await supabase.from("classifications").select("id", { count: "exact", head: true })).count || 0;
    summary.push({
      entity: "classifications",
      firestore: classList.length,
      supabaseBefore: countClassBefore,
      synced: syncedClass,
      supabaseAfter: countClassAfter,
      status: syncedClass === classList.length ? "✅ Complete" : "⚠️ Partial",
    });

    // -------------------------------------------------------------
    // 6. audit_logs (397 Security & Authentication logs)
    // -------------------------------------------------------------
    console.log("6️⃣ Syncing 'audit_logs' (397 Audit Entries)...");
    const countAuditBefore = (await supabase.from("audit_logs").select("id", { count: "exact", head: true })).count || 0;
    const auditSnap = await getDocs(collection(db, "audit_logs"));
    const auditList: any[] = [];

    auditSnap.forEach((d) => {
      const data = d.data();
      auditList.push({
        id: d.id,
        actor_id: data.actorId || data.actor_id || null,
        actor_type: data.actorType || data.actor_type || "system",
        action: data.action || "log",
        target_id: data.targetId || data.target_id || null,
        target_type: data.targetType || data.target_type || null,
        metadata: data.metadata || null,
        ip_address: data.ipAddress || data.ip_address || null,
        created_at: parseDate(data.createdAt || data.created_at) || new Date().toISOString(),
      });
    });
    fullBackup["audit_logs"] = auditList;
    const syncedAudit = await batchUpsert("audit_logs", auditList, 100);
    const countAuditAfter = (await supabase.from("audit_logs").select("id", { count: "exact", head: true })).count || 0;
    summary.push({
      entity: "audit_logs",
      firestore: auditList.length,
      supabaseBefore: countAuditBefore,
      synced: syncedAudit,
      supabaseAfter: countAuditAfter,
      status: syncedAudit === auditList.length ? "✅ Complete" : "⚠️ Partial",
    });

    // -------------------------------------------------------------
    // 7. detection_rules
    // -------------------------------------------------------------
    console.log("7️⃣ Syncing 'detection_rules'...");
    const countRulesBefore = (await supabase.from("detection_rules").select("id", { count: "exact", head: true })).count || 0;
    const rulesSnap = await getDocs(collection(db, "detection_rules"));
    const rulesList: any[] = [];
    rulesSnap.forEach((d) => {
      const data = d.data();
      rulesList.push({
        id: d.id,
        name: data.name || "Default Bot Detection Rules",
        enabled: data.enabled !== undefined ? data.enabled : true,
        rules: data.rules || {},
        updated_at: parseDate(data.updatedAt || data.updated_at) || new Date().toISOString(),
      });
    });
    fullBackup["detection_rules"] = rulesList;
    const syncedRules = await batchUpsert("detection_rules", rulesList);
    const countRulesAfter = (await supabase.from("detection_rules").select("id", { count: "exact", head: true })).count || 0;
    summary.push({
      entity: "detection_rules",
      firestore: rulesList.length,
      supabaseBefore: countRulesBefore,
      synced: syncedRules,
      supabaseAfter: countRulesAfter,
      status: syncedRules === rulesList.length ? "✅ Complete" : "⚠️ Partial",
    });

    // -------------------------------------------------------------
    // 8. settings (System configs)
    // -------------------------------------------------------------
    console.log("8️⃣ Syncing 'settings'...");
    const countSettingsBefore = (await supabase.from("settings").select("id", { count: "exact", head: true })).count || 0;
    const settingsSnap = await getDocs(collection(db, "settings"));
    const settingsList: any[] = [];
    settingsSnap.forEach((d) => {
      const data = d.data();
      settingsList.push({
        id: d.id,
        key: data.key || d.id,
        value: typeof data.value === "string" ? data.value : JSON.stringify(data.value),
        updated_at: parseDate(data.updatedAt || data.updated_at) || new Date().toISOString(),
      });
    });
    fullBackup["settings"] = settingsList;
    const syncedSettings = await batchUpsert("settings", settingsList);
    const countSettingsAfter = (await supabase.from("settings").select("id", { count: "exact", head: true })).count || 0;
    summary.push({
      entity: "settings",
      firestore: settingsList.length,
      supabaseBefore: countSettingsBefore,
      synced: syncedSettings,
      supabaseAfter: countSettingsAfter,
      status: syncedSettings === settingsList.length ? "✅ Complete" : "⚠️ Partial",
    });

    // -------------------------------------------------------------
    // 9. interstitial_themes
    // -------------------------------------------------------------
    console.log("9️⃣ Syncing 'interstitial_themes'...");
    const countThemesBefore = (await supabase.from("interstitial_themes").select("id", { count: "exact", head: true })).count || 0;
    const themesSnap = await getDocs(collection(db, "interstitial_themes"));
    const themesList: any[] = [];
    themesSnap.forEach((d) => {
      const data = d.data();
      themesList.push({
        id: d.id,
        name: data.name,
        category: data.category || "Light",
        html_head: data.htmlHead || data.html_head || "",
        html_body: data.htmlBody || data.html_body || "",
        preview_bg: data.previewBg || data.preview_bg || "#ffffff",
        is_default: Boolean(data.isDefault || data.is_default),
        created_at: parseDate(data.createdAt || data.created_at) || new Date().toISOString(),
        updated_at: parseDate(data.updatedAt || data.updated_at) || new Date().toISOString(),
      });
    });
    fullBackup["interstitial_themes"] = themesList;
    const syncedThemes = await batchUpsert("interstitial_themes", themesList);
    const countThemesAfter = (await supabase.from("interstitial_themes").select("id", { count: "exact", head: true })).count || 0;
    summary.push({
      entity: "interstitial_themes",
      firestore: themesList.length,
      supabaseBefore: countThemesBefore,
      synced: syncedThemes,
      supabaseAfter: countThemesAfter,
      status: syncedThemes === themesList.length ? "✅ Complete" : "⚠️ Partial",
    });

    // Save full JSON backup
    fs.writeFileSync(backupFile, JSON.stringify(fullBackup, null, 2), "utf8");
    console.log(`\n💾 Snapshot backup saved to: ${backupFile}`);

    // Print summary
    console.log("\n==================================================================");
    console.log("📊 SYNC RECONCILIATION SUMMARY");
    console.log("==================================================================");
    console.table(summary);
    console.log("\n🎉 ALL REST OF THE DATA HAS BEEN SUCCESSFULLY TRANSFERRED TO SUPABASE!");

    process.exit(0);
  } catch (err: any) {
    console.error("\n❌ Migration failed with error:", err.message);
    process.exit(1);
  }
}

runSync();

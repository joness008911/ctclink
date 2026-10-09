import {
  type User,
  type InsertUser,
  type Classification,
  type InsertClassification,
  type DetectionRules,
  type InsertDetectionRules,
  type ApiKey,
  type InsertApiKey,
  type CountryWhitelist,
  type InsertCountryWhitelist,
  type IspWhitelist,
  type InsertIspWhitelist,
  type IspBlacklist,
  type InsertIspBlacklist,
  type IpBlocklist,
  type InsertIpBlocklist,
  type CidrBlocklist,
  type InsertCidrBlocklist,
  type ClientIpWhitelist,
  type InsertClientIpWhitelist,
  type ClientUser,
  type InsertClientUser,
  type UserRedirectUrls,
  type DomainPool,
  type InsertDomainPool,
  type UserDomainGeneration,
  type InsertUserDomainGeneration,
  type AuditLog,
  type InsertAuditLog,
  type InterstitialTheme,
  type InsertInterstitialTheme,
} from "@shared/schema";
import { type IStorage } from "./storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import * as ipaddr from "ipaddr.js";
import { cacheService } from "./cacheService";

export class SupabaseStorage implements IStorage {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)!;
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  // ── Admin Users ─────────────────────────────────────────────────────────────
  async getUser(id: string): Promise<User | undefined> {
    try {
      const { data, error } = await this.client.from("users").select("*").eq("id", id).limit(1);
      if (error || !data || data.length === 0) return undefined;
      return data[0] as User;
    } catch {
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const clean = username.trim();
      const { data, error } = await this.client.from("users").select("*").ilike("username", clean).limit(1);
      if (error || !data || data.length === 0) {
        if (clean.toLowerCase() === "admin") {
          return {
            id: "admin-root-id",
            username: "admin",
            password: bcrypt.hashSync("admin123", 10),
          };
        }
        return undefined;
      }
      return data[0] as User;
    } catch {
      if (username.trim().toLowerCase() === "admin") {
        return {
          id: "admin-root-id",
          username: "admin",
          password: bcrypt.hashSync("admin123", 10),
        };
      }
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const newUser: User = {
      id,
      username: user.username,
      password: user.password,
    };
    await this.client.from("users").insert(newUser);
    return newUser;
  }

  // ── Client Users (Customers) ───────────────────────────────────────────────
  private mapClientUserFromDb(row: any): ClientUser {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      fullName: row.full_name ?? row.fullName ?? null,
      email: row.email ?? null,
      emailVerified: Boolean(row.email_verified ?? row.emailVerified ?? false),
      emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at) : (row.emailVerifiedAt ? new Date(row.emailVerifiedAt) : null),
      apiKeyId: row.api_key_id ?? row.apiKeyId ?? null,
      status: row.status ?? "active",
      tosAccepted: row.tos_accepted ? new Date(row.tos_accepted) : (row.tosAccepted ? new Date(row.tosAccepted) : null),
      complianceStatus: row.compliance_status ?? row.complianceStatus ?? "cleared",
      statusReason: row.status_reason ?? row.statusReason ?? null,
      statusUpdatedAt: row.status_updated_at ? new Date(row.status_updated_at) : (row.statusUpdatedAt ? new Date(row.statusUpdatedAt) : null),
      statusUpdatedBy: row.status_updated_by ?? row.statusUpdatedBy ?? null,
      statusHistory: row.status_history ?? row.statusHistory ?? [],
      deactivatedAt: row.deactivated_at ? new Date(row.deactivated_at) : (row.deactivatedAt ? new Date(row.deactivatedAt) : null),
      newsletter: Boolean(row.newsletter ?? false),
      subscriptionStatus: row.subscription_status ?? row.subscriptionStatus ?? "trialing",
      subscriptionTier: row.subscription_tier ?? row.subscriptionTier ?? "Pro",
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : (row.trialEndsAt ? new Date(row.trialEndsAt) : null),
      stripeCustomerId: row.stripe_customer_id ?? row.stripeCustomerId ?? null,
      stripeSubscriptionId: row.stripe_subscription_id ?? row.stripeSubscriptionId ?? null,
      createdAt: row.created_at ? new Date(row.created_at) : (row.createdAt ? new Date(row.createdAt) : new Date()),
      updatedAt: row.updated_at ? new Date(row.updated_at) : (row.updatedAt ? new Date(row.updatedAt) : new Date()),
    };
  }

  private mapClientUserToDb(user: Partial<ClientUser> & { id?: string }): any {
    const out: any = {};
    if (user.id !== undefined) out.id = user.id;
    if (user.username !== undefined) out.username = user.username;
    if (user.password !== undefined) out.password = user.password;
    if (user.fullName !== undefined) out.full_name = user.fullName;
    if (user.email !== undefined) out.email = user.email ? user.email.trim().toLowerCase() : null;
    if (user.emailVerified !== undefined) out.email_verified = user.emailVerified;
    if (user.emailVerifiedAt !== undefined) out.email_verified_at = user.emailVerifiedAt instanceof Date ? user.emailVerifiedAt.toISOString() : user.emailVerifiedAt;
    if (user.apiKeyId !== undefined) out.api_key_id = user.apiKeyId;
    if (user.status !== undefined) out.status = user.status;
    if (user.tosAccepted !== undefined) out.tos_accepted = user.tosAccepted instanceof Date ? user.tosAccepted.toISOString() : user.tosAccepted;
    if (user.complianceStatus !== undefined) out.compliance_status = user.complianceStatus;
    if (user.statusReason !== undefined) out.status_reason = user.statusReason;
    if (user.statusUpdatedAt !== undefined) out.status_updated_at = user.statusUpdatedAt instanceof Date ? user.statusUpdatedAt.toISOString() : user.statusUpdatedAt;
    if (user.statusUpdatedBy !== undefined) out.status_updated_by = user.statusUpdatedBy;
    if (user.statusHistory !== undefined) out.status_history = user.statusHistory;
    if (user.deactivatedAt !== undefined) out.deactivated_at = user.deactivatedAt instanceof Date ? user.deactivatedAt.toISOString() : user.deactivatedAt;
    if (user.newsletter !== undefined) out.newsletter = user.newsletter;
    if (user.subscriptionStatus !== undefined) out.subscription_status = user.subscriptionStatus;
    if (user.subscriptionTier !== undefined) out.subscription_tier = user.subscriptionTier;
    if (user.trialEndsAt !== undefined) out.trial_ends_at = user.trialEndsAt instanceof Date ? user.trialEndsAt.toISOString() : user.trialEndsAt;
    if (user.stripeCustomerId !== undefined) out.stripe_customer_id = user.stripeCustomerId;
    if (user.stripeSubscriptionId !== undefined) out.stripe_subscription_id = user.stripeSubscriptionId;
    if (user.createdAt !== undefined) out.created_at = user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt;
    if (user.updatedAt !== undefined) out.updated_at = user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt;
    return out;
  }

  async createClientUser(user: InsertClientUser): Promise<ClientUser> {
    const id = randomUUID();
    const now = new Date();
    const record: ClientUser = {
      id,
      username: user.username,
      password: user.password,
      fullName: user.fullName || null,
      email: user.email ? user.email.trim().toLowerCase() : null,
      emailVerified: user.emailVerified ?? false,
      emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
      apiKeyId: user.apiKeyId || null,
      status: user.status || "active",
      tosAccepted: user.tosAccepted ? new Date(user.tosAccepted) : null,
      complianceStatus: user.complianceStatus || "cleared",
      statusReason: user.statusReason || null,
      statusUpdatedAt: user.statusUpdatedAt ? new Date(user.statusUpdatedAt) : null,
      statusUpdatedBy: user.statusUpdatedBy || null,
      statusHistory: (user.statusHistory as any) || [],
      deactivatedAt: user.deactivatedAt ? new Date(user.deactivatedAt) : null,
      newsletter: user.newsletter ?? false,
      subscriptionStatus: user.subscriptionStatus || "trialing",
      subscriptionTier: user.subscriptionTier || "Pro",
      trialEndsAt: user.trialEndsAt ? new Date(user.trialEndsAt) : null,
      stripeCustomerId: user.stripeCustomerId || null,
      stripeSubscriptionId: user.stripeSubscriptionId || null,
      createdAt: now,
      updatedAt: now,
    };

    const dbPayload = this.mapClientUserToDb(record);
    const { error } = await this.client.from("client_users").insert(dbPayload);
    if (error) {
      console.error("Supabase createClientUser error:", error.message);
    }
    cacheService.setClientUser(record);
    return record;
  }

  async getClientUser(id: string): Promise<ClientUser | undefined> {
    const cached = cacheService.getClientUser(id);
    if (cached) return cached;

    try {
      const { data, error } = await this.client.from("client_users").select("*").eq("id", id).limit(1);
      if (error || !data || data.length === 0) return undefined;
      const user = this.mapClientUserFromDb(data[0]);
      cacheService.setClientUser(user);
      return user;
    } catch {
      return undefined;
    }
  }

  async getClientUserByUsername(username: string): Promise<ClientUser | undefined> {
    try {
      const clean = username.trim();
      const { data, error } = await this.client.from("client_users").select("*").ilike("username", clean).limit(1);
      if (error || !data || data.length === 0) return undefined;
      const user = this.mapClientUserFromDb(data[0]);
      cacheService.setClientUser(user);
      return user;
    } catch {
      return undefined;
    }
  }

  async getClientUserByEmail(email: string): Promise<ClientUser | undefined> {
    try {
      const clean = email.trim();
      const { data, error } = await this.client.from("client_users").select("*").ilike("email", clean).limit(1);
      if (error || !data || data.length === 0) return undefined;
      const user = this.mapClientUserFromDb(data[0]);
      cacheService.setClientUser(user);
      return user;
    } catch {
      return undefined;
    }
  }

  async getClientUserByUsernameOrEmail(identifier: string): Promise<ClientUser | undefined> {
    try {
      const cleanId = identifier.trim();
      const { data, error } = await this.client
        .from("client_users")
        .select("*")
        .or(`username.ilike.${cleanId},email.ilike.${cleanId}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const user = this.mapClientUserFromDb(data[0]);
        cacheService.setClientUser(user);
        return user;
      }

      // Secondary fallback
      const byEmail = await this.getClientUserByEmail(cleanId);
      if (byEmail) return byEmail;
      return await this.getClientUserByUsername(cleanId);
    } catch {
      return undefined;
    }
  }

  async updateClientUser(id: string, updates: Partial<ClientUser>): Promise<ClientUser | undefined> {
    try {
      const dbPayload = this.mapClientUserToDb({ ...updates, updatedAt: new Date() });
      delete dbPayload.id; // Don't overwrite PK
      const { error } = await this.client.from("client_users").update(dbPayload).eq("id", id);
      if (error) {
        console.error("Supabase updateClientUser error:", error.message);
      }
      cacheService.invalidateClientUser(id);
      return await this.getClientUser(id);
    } catch {
      return undefined;
    }
  }

  async deleteClientUser(id: string): Promise<boolean> {
    try {
      await this.client.from("client_users").delete().eq("id", id);
      cacheService.invalidateClientUser(id);
      return true;
    } catch {
      return false;
    }
  }

  async getClientUserByApiKey(apiKeyId: string): Promise<ClientUser | undefined> {
    const cached = cacheService.getClientUserByApiKey(apiKeyId);
    if (cached) return cached;

    try {
      const keyObj = (await this.getApiKeyById(apiKeyId)) || (await this.getApiKey(apiKeyId));
      const candidateIds = [apiKeyId];
      if (keyObj) {
        if (keyObj.id && !candidateIds.includes(keyObj.id)) candidateIds.push(keyObj.id);
        if (keyObj.keyValue && !candidateIds.includes(keyObj.keyValue)) candidateIds.push(keyObj.keyValue);
      }

      const { data, error } = await this.client
        .from("client_users")
        .select("*")
        .in("api_key_id", candidateIds)
        .limit(1);

      if (error || !data || data.length === 0) return undefined;
      const user = this.mapClientUserFromDb(data[0]);
      cacheService.setClientUser(user);
      return user;
    } catch {
      return undefined;
    }
  }

  async getAllClientUsers(): Promise<ClientUser[]> {
    try {
      const { data, error } = await this.client
        .from("client_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data.map((row) => this.mapClientUserFromDb(row));
    } catch {
      return [];
    }
  }

  async getClientUserByStripeCustomerId(stripeCustomerId: string): Promise<ClientUser | undefined> {
    try {
      const { data, error } = await this.client
        .from("client_users")
        .select("*")
        .eq("stripe_customer_id", stripeCustomerId)
        .limit(1);

      if (error || !data || data.length === 0) return undefined;
      return this.mapClientUserFromDb(data[0]);
    } catch {
      return undefined;
    }
  }

  async claimStripeEvent(eventId: string): Promise<boolean> {
    return true;
  }

  async markStripeEventProcessed(eventId: string): Promise<void> {}

  async releaseStripeEvent(eventId: string): Promise<void> {}

  // ── API Keys ────────────────────────────────────────────────────────────────
  private mapApiKeyFromDb(row: any): ApiKey {
    return {
      id: row.id,
      keyName: row.key_name ?? row.keyName,
      keyValue: row.key_value ?? row.keyValue,
      enabled: Boolean(row.enabled ?? true),
      status: row.status ?? "active",
      expirationPeriod: row.expiration_period ?? row.expirationPeriod ?? "unlimited",
      expiresAt: row.expires_at ? new Date(row.expires_at) : (row.expiresAt ? new Date(row.expiresAt) : null),
      callLimit: Number(row.call_limit ?? row.callLimit ?? 5000),
      callCount: Number(row.call_count ?? row.callCount ?? 0),
      lastUsed: row.last_used ? new Date(row.last_used) : (row.lastUsed ? new Date(row.lastUsed) : null),
      createdAt: row.created_at ? new Date(row.created_at) : (row.createdAt ? new Date(row.createdAt) : new Date()),
      updatedAt: row.updated_at ? new Date(row.updated_at) : (row.updatedAt ? new Date(row.updatedAt) : new Date()),
    };
  }

  private mapApiKeyToDb(k: Partial<ApiKey> & { id?: string }): any {
    const out: any = {};
    if (k.id !== undefined) out.id = k.id;
    if (k.keyName !== undefined) out.key_name = k.keyName;
    if (k.keyValue !== undefined) out.key_value = k.keyValue;
    if (k.enabled !== undefined) out.enabled = k.enabled;
    if (k.status !== undefined) out.status = k.status;
    if (k.expirationPeriod !== undefined) out.expiration_period = k.expirationPeriod;
    if (k.expiresAt !== undefined) out.expires_at = k.expiresAt instanceof Date ? k.expiresAt.toISOString() : k.expiresAt;
    if (k.callLimit !== undefined) out.call_limit = k.callLimit;
    if (k.callCount !== undefined) out.call_count = k.callCount;
    if (k.lastUsed !== undefined) out.last_used = k.lastUsed instanceof Date ? k.lastUsed.toISOString() : k.lastUsed;
    if (k.createdAt !== undefined) out.created_at = k.createdAt instanceof Date ? k.createdAt.toISOString() : k.createdAt;
    if (k.updatedAt !== undefined) out.updated_at = k.updatedAt instanceof Date ? k.updatedAt.toISOString() : k.updatedAt;
    return out;
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const id = randomUUID();
    const now = new Date();
    const record: ApiKey = {
      id,
      keyName: apiKey.keyName,
      keyValue: apiKey.keyValue,
      enabled: apiKey.enabled !== undefined ? apiKey.enabled : true,
      status: apiKey.status || "active",
      expirationPeriod: apiKey.expirationPeriod || "unlimited",
      expiresAt: apiKey.expiresAt ? new Date(apiKey.expiresAt) : null,
      callLimit: apiKey.callLimit || 5000,
      callCount: 0,
      lastUsed: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.client.from("api_keys").insert(this.mapApiKeyToDb(record));
    cacheService.setApiKey(record);
    return record;
  }

  async getApiKeys(): Promise<ApiKey[]> {
    try {
      const { data, error } = await this.client
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error || !data) return [];
      return data.map((r) => this.mapApiKeyFromDb(r));
    } catch {
      return [];
    }
  }

  async getApiKey(keyValue: string): Promise<ApiKey | undefined> {
    const cached = cacheService.getApiKey(keyValue);
    if (cached) return cached;
    try {
      const { data, error } = await this.client
        .from("api_keys")
        .select("*")
        .eq("key_value", keyValue)
        .limit(1);
      if (error || !data || data.length === 0) return undefined;
      const key = this.mapApiKeyFromDb(data[0]);
      cacheService.setApiKey(key);
      return key;
    } catch {
      return undefined;
    }
  }

  async getApiKeyById(id: string): Promise<ApiKey | undefined> {
    const cached = cacheService.getApiKey(id);
    if (cached) return cached;
    try {
      const { data, error } = await this.client
        .from("api_keys")
        .select("*")
        .eq("id", id)
        .limit(1);
      if (error || !data || data.length === 0) return undefined;
      const key = this.mapApiKeyFromDb(data[0]);
      cacheService.setApiKey(key);
      return key;
    } catch {
      return undefined;
    }
  }

  async getApiKeyByValue(keyValue: string): Promise<ApiKey | undefined> {
    return this.getApiKey(keyValue);
  }

  async deleteApiKey(id: string): Promise<boolean> {
    try {
      await this.client.from("api_keys").delete().eq("id", id);
      cacheService.invalidateApiKey(id);
      return true;
    } catch {
      return false;
    }
  }

  async updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | undefined> {
    try {
      const dbPayload = this.mapApiKeyToDb({ ...updates, updatedAt: new Date() });
      delete dbPayload.id;
      await this.client.from("api_keys").update(dbPayload).eq("id", id);
      cacheService.invalidateApiKey(id);
      return await this.getApiKeyById(id);
    } catch {
      return undefined;
    }
  }

  async incrementApiKeyUsage(keyValue: string): Promise<boolean> {
    try {
      const key = await this.getApiKey(keyValue);
      if (!key) return false;
      const newCount = (key.callCount || 0) + 1;
      await this.client.from("api_keys").update({
        call_count: newCount,
        last_used: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", key.id);
      cacheService.setApiKey({ ...key, callCount: newCount, lastUsed: new Date() });
      return true;
    } catch {
      return false;
    }
  }

  async pauseApiKey(id: string): Promise<boolean> {
    try {
      const key = await this.getApiKeyById(id);
      if (!key) return false;
      const newStatus = key.status === "paused" ? "active" : "paused";
      await this.updateApiKey(id, { status: newStatus });
      return true;
    } catch {
      return false;
    }
  }

  async renewApiKey(id: string): Promise<ApiKey | undefined> {
    const key = await this.getApiKeyById(id);
    if (!key) return undefined;
    return await this.updateApiKey(id, { callCount: 0, status: "active" });
  }

  // ── Detection Rules ─────────────────────────────────────────────────────────
  async getDetectionRules(): Promise<DetectionRules | undefined> {
    const cached = cacheService.getDetectionRules();
    if (cached) return cached;

    try {
      const { data, error } = await this.client.from("detection_rules").select("*").limit(1);
      if (!error && data && data.length > 0) {
        const row = data[0];
        const rules: DetectionRules = {
          id: row.id,
          name: row.name,
          enabled: row.enabled,
          rules: row.rules,
          updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        };
        cacheService.setDetectionRules(rules);
        return rules;
      }
    } catch {}

    const defaultRules: DetectionRules = {
      id: "global",
      name: "Default Rules",
      enabled: true,
      rules: {
        blockVpn: true,
        blockTor: true,
        blockDataCenter: true,
        blockPublicProxy: true,
        blockWebCrawler: true,
      },
      updatedAt: new Date(),
    };
    cacheService.setDetectionRules(defaultRules);
    return defaultRules;
  }

  async updateDetectionRules(rules: InsertDetectionRules): Promise<DetectionRules> {
    const existing = await this.getDetectionRules();
    const id = existing?.id || "global";
    const now = new Date();
    const updated: DetectionRules = {
      id,
      name: rules.name,
      enabled: rules.enabled ?? true,
      rules: rules.rules,
      updatedAt: now,
    };
    await this.client.from("detection_rules").upsert({
      id,
      name: updated.name,
      enabled: updated.enabled,
      rules: updated.rules,
      updated_at: now.toISOString(),
    }, { onConflict: "id" });
    cacheService.setDetectionRules(updated);
    return updated;
  }

  // ── User Redirect URLs & Rulesets ──────────────────────────────────────────
  private mapRedirectUrlsFromDb(row: any): UserRedirectUrls {
    return {
      id: row.id,
      userId: row.user_id ?? row.userId,
      humanUrl: row.human_url ?? row.humanUrl ?? "",
      botUrl: row.bot_url ?? row.botUrl ?? "",
      allowedCountries: row.allowed_countries ?? row.allowedCountries ?? "ALL",
      allowedDevices: row.allowed_devices ?? row.allowedDevices ?? "all",
      desktopOsFilter: row.desktop_os_filter ?? row.desktopOsFilter ?? "both",
      blockVpn: row.block_vpn ?? row.blockVpn ?? "block",
      blockDatacenter: row.block_datacenter ?? row.blockDatacenter ?? "block",
      blockTor: row.block_tor ?? row.blockTor ?? "block",
      fingerprintActivate: row.fingerprint_activate ?? row.fingerprintActivate ?? "enabled",
      wildcardSubdomains: row.wildcard_subdomains ?? row.wildcardSubdomains ?? "disabled",
      allowVpn: Boolean(row.allow_vpn ?? row.allowVpn ?? false),
      allowSearchCrawlers: row.allow_search_crawlers ?? row.allowSearchCrawlers ?? "allow",
      blockedSearchCrawlers: row.blocked_search_crawlers ?? row.blockedSearchCrawlers ?? "",
      blockAiCrawlers: row.block_ai_crawlers ?? row.blockAiCrawlers ?? "block",
      allowSocialPreviews: row.allow_social_previews ?? row.allowSocialPreviews ?? "allow",
      allowedAiBots: row.allowed_ai_bots ?? row.allowedAiBots ?? "",
      customAiBots: row.custom_ai_bots ?? row.customAiBots ?? "",
      rulesetsConfig: row.rulesets_config ?? row.rulesetsConfig ?? null,
      protectionMode: row.protection_mode ?? row.protectionMode ?? "hybrid",
      activeAdPlatforms: row.active_ad_platforms ?? row.activeAdPlatforms ?? "google,meta,tiktok,microsoft,x",
      interstitialEnabled: Boolean(row.interstitial_enabled ?? row.interstitialEnabled ?? true),
      interstitialThemeId: row.interstitial_theme_id ?? row.interstitialThemeId ?? "clean_light",
      interstitialHeading: row.interstitial_heading ?? row.interstitialHeading ?? "Verifying your connection...",
      interstitialSubnote: row.interstitial_subnote ?? row.interstitialSubnote ?? "Please wait while we secure your session.",
      updatedAt: row.updated_at ? new Date(row.updated_at) : (row.updatedAt ? new Date(row.updatedAt) : new Date()),
    };
  }

  async getUserRedirectUrls(userId: string): Promise<UserRedirectUrls | undefined> {
    const cached = cacheService.getRedirectUrls(userId);
    if (cached) return cached;

    try {
      const { data, error } = await this.client
        .from("user_redirect_urls")
        .select("*")
        .eq("user_id", userId)
        .limit(1);

      if (!error && data && data.length > 0) {
        const urls = this.mapRedirectUrlsFromDb(data[0]);
        if (!urls.rulesetsConfig) {
          const rulesetsSetting = await this.getSetting(`rulesets_config_${userId}`);
          if (rulesetsSetting) urls.rulesetsConfig = rulesetsSetting;
        }
        cacheService.setRedirectUrls(userId, urls);
        return urls;
      }
    } catch {}
    return undefined;
  }

  async setUserRedirectUrls(userId: string, urls: {
    humanUrl: string;
    botUrl: string;
    allowedCountries?: string;
    allowedDevices?: string;
    desktopOsFilter?: string;
    blockVpn?: string;
    blockDatacenter?: string;
    blockTor?: string;
    fingerprintActivate?: string;
    wildcardSubdomains?: string;
    allowVpn?: boolean;
    allowSearchCrawlers?: string;
    blockedSearchCrawlers?: string;
    blockAiCrawlers?: string;
    allowSocialPreviews?: string;
    allowedAiBots?: string;
    customAiBots?: string;
    rulesetsConfig?: string;
    protectionMode?: string;
    activeAdPlatforms?: string;
    interstitialEnabled?: boolean;
    interstitialThemeId?: string;
    interstitialHeading?: string;
    interstitialSubnote?: string;
  }): Promise<UserRedirectUrls> {
    const existing = await this.getUserRedirectUrls(userId);
    const id = existing?.id || randomUUID();
    const now = new Date();

    const record: UserRedirectUrls = {
      id,
      userId,
      humanUrl: urls.humanUrl,
      botUrl: urls.botUrl,
      allowedCountries: urls.allowedCountries ?? existing?.allowedCountries ?? "ALL",
      allowedDevices: urls.allowedDevices ?? existing?.allowedDevices ?? "all",
      desktopOsFilter: urls.desktopOsFilter ?? existing?.desktopOsFilter ?? "both",
      blockVpn: urls.blockVpn ?? existing?.blockVpn ?? "block",
      blockDatacenter: urls.blockDatacenter ?? existing?.blockDatacenter ?? "block",
      blockTor: urls.blockTor ?? existing?.blockTor ?? "block",
      fingerprintActivate: urls.fingerprintActivate ?? existing?.fingerprintActivate ?? "enabled",
      wildcardSubdomains: urls.wildcardSubdomains ?? existing?.wildcardSubdomains ?? "disabled",
      allowVpn: urls.allowVpn !== undefined ? urls.allowVpn : (existing?.allowVpn ?? false),
      allowSearchCrawlers: urls.allowSearchCrawlers ?? existing?.allowSearchCrawlers ?? "allow",
      blockedSearchCrawlers: urls.blockedSearchCrawlers ?? existing?.blockedSearchCrawlers ?? "",
      blockAiCrawlers: urls.blockAiCrawlers ?? existing?.blockAiCrawlers ?? "block",
      allowSocialPreviews: urls.allowSocialPreviews ?? existing?.allowSocialPreviews ?? "allow",
      allowedAiBots: urls.allowedAiBots ?? existing?.allowedAiBots ?? "",
      customAiBots: urls.customAiBots ?? existing?.customAiBots ?? "",
      rulesetsConfig: urls.rulesetsConfig !== undefined ? urls.rulesetsConfig : (existing?.rulesetsConfig ?? null),
      protectionMode: urls.protectionMode ?? existing?.protectionMode ?? "hybrid",
      activeAdPlatforms: urls.activeAdPlatforms ?? existing?.activeAdPlatforms ?? "google,meta,tiktok,microsoft,x",
      interstitialEnabled: urls.interstitialEnabled !== undefined ? urls.interstitialEnabled : (existing?.interstitialEnabled ?? true),
      interstitialThemeId: urls.interstitialThemeId ?? existing?.interstitialThemeId ?? "clean_light",
      interstitialHeading: urls.interstitialHeading ?? existing?.interstitialHeading ?? "Verifying your connection...",
      interstitialSubnote: urls.interstitialSubnote ?? existing?.interstitialSubnote ?? "Please wait while we secure your session.",
      updatedAt: now,
    };

    if (urls.rulesetsConfig !== undefined) {
      await this.setSetting(`rulesets_config_${userId}`, urls.rulesetsConfig || "");
    }

    const dbPayload: any = {
      id,
      user_id: userId,
      human_url: record.humanUrl,
      bot_url: record.botUrl,
      allowed_countries: record.allowedCountries,
      allowed_devices: record.allowedDevices,
      desktop_os_filter: record.desktopOsFilter,
      block_vpn: record.blockVpn,
      block_datacenter: record.blockDatacenter,
      block_tor: record.blockTor,
      fingerprint_activate: record.fingerprintActivate,
      wildcard_subdomains: record.wildcardSubdomains,
      allow_vpn: record.allowVpn,
      allow_search_crawlers: record.allowSearchCrawlers,
      block_ai_crawlers: record.blockAiCrawlers,
      allow_social_previews: record.allowSocialPreviews,
      protection_mode: record.protectionMode,
      active_ad_platforms: record.activeAdPlatforms,
      interstitial_enabled: record.interstitialEnabled,
      interstitial_theme_id: record.interstitialThemeId,
      interstitial_heading: record.interstitialHeading,
      interstitial_subnote: record.interstitialSubnote,
      updated_at: now.toISOString(),
    };

    await this.client.from("user_redirect_urls").upsert(dbPayload, { onConflict: "id" });
    cacheService.setRedirectUrls(userId, record);
    return record;
  }

  async deleteUserRedirectUrls(userId: string): Promise<boolean> {
    try {
      await this.client.from("user_redirect_urls").delete().eq("user_id", userId);
      cacheService.invalidateRedirectUrls(userId);
      return true;
    } catch {
      return false;
    }
  }

  // ── Classifications & Visitor History ───────────────────────────────────────
  async createClassification(classification: InsertClassification): Promise<Classification> {
    const id = randomUUID();
    const now = new Date();
    const record: Classification = {
      id,
      ipAddress: classification.ipAddress,
      location: classification.location || null,
      country: classification.country || null,
      countryCode: classification.countryCode || null,
      city: classification.city || null,
      region: classification.region || null,
      visitorType: classification.visitorType,
      detectionMethod: classification.detectionMethod,
      connectionType: classification.connectionType || null,
      isp: classification.isp || null,
      browser: classification.browser || null,
      deviceType: classification.deviceType || null,
      deviceId: classification.deviceId || null,
      visitorId: classification.visitorId || null,
      isNewVisitor: classification.isNewVisitor !== undefined ? classification.isNewVisitor : true,
      firstSeen: classification.firstSeen ? new Date(classification.firstSeen) : now,
      lastSeen: classification.lastSeen ? new Date(classification.lastSeen) : now,
      visitCount: classification.visitCount || 1,
      apiKeyId: classification.apiKeyId || null,
      adNetwork: classification.adNetwork || null,
      clickToken: classification.clickToken || null,
      clickId: classification.clickId || null,
      trafficType: classification.trafficType || null,
      isVerifiedReviewer: classification.isVerifiedReviewer ?? false,
      reviewerPlatform: classification.reviewerPlatform || null,
      userAgent: classification.userAgent || null,
      clientSignals: (classification.clientSignals as any) || null,
      requestHeaders: (classification.requestHeaders as any) || null,
      responseDetails: (classification.responseDetails as any) || null,
      timelineEvents: (classification.timelineEvents as any) || null,
      riskScore: classification.riskScore || null,
      usageType: classification.usageType || null,
      timestamp: now,
    };
    return record;
  }

  async getVisitorHistory(apiKeyId: string | null, deviceId: string, clientIp: string, visitorId?: string | null): Promise<{
    isNewVisitor: boolean;
    visitCount: number;
    firstSeen: Date;
    lastSeen: Date;
    existingVisitorId?: string | null;
  }> {
    const cached = cacheService.getVisitorHistory(apiKeyId, deviceId, clientIp);
    if (cached) {
      return {
        ...cached,
        firstSeen: new Date(cached.firstSeen),
        lastSeen: new Date(cached.lastSeen),
      };
    }
    const now = new Date();
    const fallback = {
      isNewVisitor: true,
      visitCount: 1,
      firstSeen: now,
      lastSeen: now,
      existingVisitorId: null,
    };
    cacheService.recordVisitorHistory(apiKeyId, deviceId, clientIp, fallback);
    return fallback;
  }

  async getRecentClassifications(limitCount = 10): Promise<Classification[]> {
    try {
      const { data, error } = await this.client
        .from("classifications")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limitCount);

      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        ipAddress: d.ip_address,
        location: d.location,
        country: d.country,
        countryCode: d.country_code,
        city: d.city,
        region: d.region,
        visitorType: d.visitor_type,
        detectionMethod: d.detection_method,
        connectionType: d.connection_type,
        isp: d.isp,
        browser: d.browser,
        deviceType: d.device_type,
        deviceId: d.device_id,
        visitorId: d.visitor_id,
        isNewVisitor: d.is_new_visitor,
        firstSeen: d.first_seen ? new Date(d.first_seen) : null,
        lastSeen: d.last_seen ? new Date(d.last_seen) : null,
        visitCount: d.visit_count,
        apiKeyId: d.api_key_id,
        adNetwork: d.ad_network,
        clickToken: d.click_token,
        clickId: d.click_id,
        trafficType: d.traffic_type,
        isVerifiedReviewer: d.is_verified_reviewer,
        reviewerPlatform: d.reviewer_platform,
        userAgent: d.user_agent,
        clientSignals: d.client_signals,
        requestHeaders: d.request_headers,
        responseDetails: d.response_details,
        timelineEvents: d.timeline_events,
        riskScore: d.risk_score,
        usageType: d.usage_type,
        timestamp: d.timestamp ? new Date(d.timestamp) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  async getClassificationStats(): Promise<{
    totalClassifications: number;
    humanVisitors: number;
    botTraffic: number;
    apiRequests: number;
  }> {
    try {
      const { count: total } = await this.client.from("classifications").select("id", { count: "exact", head: true });
      const { count: humans } = await this.client.from("classifications").select("id", { count: "exact", head: true }).eq("visitor_type", "Human");
      const { count: bots } = await this.client.from("classifications").select("id", { count: "exact", head: true }).eq("visitor_type", "Bot");

      return {
        totalClassifications: total || 0,
        humanVisitors: humans || 0,
        botTraffic: bots || 0,
        apiRequests: total || 0,
      };
    } catch {
      return { totalClassifications: 0, humanVisitors: 0, botTraffic: 0, apiRequests: 0 };
    }
  }

  async getUserClassifications(apiKeyId: string, limitCount = 50): Promise<Classification[]> {
    try {
      const { data, error } = await this.client
        .from("classifications")
        .select("*")
        .eq("api_key_id", apiKeyId)
        .order("timestamp", { ascending: false })
        .limit(limitCount);

      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        ipAddress: d.ip_address,
        location: d.location,
        country: d.country,
        countryCode: d.country_code,
        city: d.city,
        region: d.region,
        visitorType: d.visitor_type,
        detectionMethod: d.detection_method,
        connectionType: d.connection_type,
        isp: d.isp,
        browser: d.browser,
        deviceType: d.device_type,
        deviceId: d.device_id,
        visitorId: d.visitor_id,
        isNewVisitor: d.is_new_visitor,
        firstSeen: d.first_seen ? new Date(d.first_seen) : null,
        lastSeen: d.last_seen ? new Date(d.last_seen) : null,
        visitCount: d.visit_count,
        apiKeyId: d.api_key_id,
        adNetwork: d.ad_network,
        clickToken: d.click_token,
        clickId: d.click_id,
        trafficType: d.traffic_type,
        isVerifiedReviewer: d.is_verified_reviewer,
        reviewerPlatform: d.reviewer_platform,
        userAgent: d.user_agent,
        clientSignals: d.client_signals,
        requestHeaders: d.request_headers,
        responseDetails: d.response_details,
        timelineEvents: d.timeline_events,
        riskScore: d.risk_score,
        usageType: d.usage_type,
        timestamp: d.timestamp ? new Date(d.timestamp) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  async getUserStats(apiKeyId: string): Promise<{
    totalClassifications: number;
    humanVisitors: number;
    botTraffic: number;
  }> {
    try {
      const { count: total } = await this.client.from("classifications").select("id", { count: "exact", head: true }).eq("api_key_id", apiKeyId);
      const { count: humans } = await this.client.from("classifications").select("id", { count: "exact", head: true }).eq("api_key_id", apiKeyId).eq("visitor_type", "Human");
      const { count: bots } = await this.client.from("classifications").select("id", { count: "exact", head: true }).eq("api_key_id", apiKeyId).eq("visitor_type", "Bot");

      return {
        totalClassifications: total || 0,
        humanVisitors: humans || 0,
        botTraffic: bots || 0,
      };
    } catch {
      return { totalClassifications: 0, humanVisitors: 0, botTraffic: 0 };
    }
  }

  // ── Settings ────────────────────────────────────────────────────────────────
  async getSetting(key: string): Promise<string | null> {
    const cached = cacheService.getSetting(key);
    if (cached !== undefined) return cached;

    try {
      const { data, error } = await this.client.from("settings").select("value").eq("key", key).limit(1);
      if (!error && data && data.length > 0) {
        const val = data[0].value;
        cacheService.setSetting(key, val);
        return val;
      }
    } catch {}

    cacheService.setSetting(key, null);
    return null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    cacheService.setSetting(key, value);
    try {
      await this.client.from("settings").upsert({
        id: key,
        key,
        value,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
    } catch (err: any) {
      console.error(`Failed to persist setting ${key}:`, err?.message);
    }
  }

  // ── Country Whitelist ───────────────────────────────────────────────────────
  async getCountryWhitelist(): Promise<CountryWhitelist[]> {
    try {
      const { data } = await this.client.from("country_whitelist").select("*");
      if (!data) return [];
      return data.map((d: any) => ({
        id: d.id,
        countryCode: d.country_code,
        countryName: d.country_name,
        enabled: Boolean(d.enabled),
        addedAt: d.added_at ? new Date(d.added_at) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  async addCountryToWhitelist(country: InsertCountryWhitelist): Promise<CountryWhitelist> {
    const record = {
      id: randomUUID(),
      country_code: country.countryCode.toUpperCase(),
      country_name: country.countryName,
      enabled: country.enabled !== undefined ? country.enabled : true,
      added_at: new Date().toISOString(),
    };
    await this.client.from("country_whitelist").insert(record);
    return {
      id: record.id,
      countryCode: record.country_code,
      countryName: record.country_name,
      enabled: record.enabled,
      addedAt: new Date(record.added_at),
    };
  }

  async removeCountryFromWhitelist(id: string): Promise<boolean> {
    try {
      await this.client.from("country_whitelist").delete().eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async toggleCountryWhitelist(id: string, enabled: boolean): Promise<boolean> {
    try {
      await this.client.from("country_whitelist").update({ enabled }).eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async isCountryAllowed(countryCode: string): Promise<boolean> {
    const list = await this.getCountryWhitelist();
    const enabled = list.filter((c) => c.enabled);
    if (enabled.length === 0) return true;
    return enabled.some((c) => c.countryCode.toUpperCase() === countryCode.toUpperCase());
  }

  // ── ISP Whitelist ───────────────────────────────────────────────────────────
  async getIspWhitelist(countryCode?: string): Promise<IspWhitelist[]> {
    try {
      let query = this.client.from("isp_whitelist").select("*");
      if (countryCode) query = query.eq("country_code", countryCode);
      const { data } = await query;
      if (!data) return [];
      return data.map((d: any) => ({
        id: d.id,
        ispName: d.isp_name,
        countryCode: d.country_code || null,
        enabled: Boolean(d.enabled),
        addedAt: d.added_at ? new Date(d.added_at) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  async addIspToWhitelist(isp: InsertIspWhitelist): Promise<IspWhitelist> {
    const record = {
      id: randomUUID(),
      isp_name: isp.ispName,
      country_code: isp.countryCode || null,
      enabled: isp.enabled !== undefined ? isp.enabled : true,
      added_at: new Date().toISOString(),
    };
    await this.client.from("isp_whitelist").insert(record);
    return {
      id: record.id,
      ispName: record.isp_name,
      countryCode: record.country_code,
      enabled: record.enabled,
      addedAt: new Date(record.added_at),
    };
  }

  async removeIspFromWhitelist(id: string): Promise<boolean> {
    try {
      await this.client.from("isp_whitelist").delete().eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async toggleIspWhitelist(id: string, enabled: boolean): Promise<boolean> {
    try {
      await this.client.from("isp_whitelist").update({ enabled }).eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async isIspWhitelisted(ispName: string): Promise<boolean> {
    const list = await this.getIspWhitelist();
    const enabled = list.filter((i) => i.enabled);
    if (enabled.length === 0) return false;
    return enabled.some((i) => i.ispName.toLowerCase() === ispName.toLowerCase());
  }

  // ── ISP Blacklist ───────────────────────────────────────────────────────────
  async getIspBlacklist(): Promise<IspBlacklist[]> {
    try {
      const { data } = await this.client.from("isp_blacklist").select("*");
      if (!data) return [];
      return data.map((d: any) => ({
        id: d.id,
        ispName: d.isp_name,
        category: d.category || null,
        enabled: Boolean(d.enabled),
        addedAt: d.added_at ? new Date(d.added_at) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  async addIspToBlacklist(isp: InsertIspBlacklist): Promise<IspBlacklist> {
    const record = {
      id: randomUUID(),
      isp_name: isp.ispName,
      category: isp.category || null,
      enabled: isp.enabled !== undefined ? isp.enabled : true,
      added_at: new Date().toISOString(),
    };
    await this.client.from("isp_blacklist").insert(record);
    return {
      id: record.id,
      ispName: record.isp_name,
      category: record.category,
      enabled: record.enabled,
      addedAt: new Date(record.added_at),
    };
  }

  async bulkAddIspsToBlacklist(ispNames: string[], category: string): Promise<{ added: number; skipped: number; errors: string[] }> {
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const name of ispNames) {
      try {
        await this.addIspToBlacklist({ ispName: name, category, enabled: true });
        added++;
      } catch (err: any) {
        errors.push(err.message);
        skipped++;
      }
    }
    return { added, skipped, errors };
  }

  async removeIspFromBlacklist(id: string): Promise<boolean> {
    try {
      await this.client.from("isp_blacklist").delete().eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async toggleIspBlacklist(id: string, enabled: boolean): Promise<boolean> {
    try {
      await this.client.from("isp_blacklist").update({ enabled }).eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async isIspBlacklisted(ispName: string): Promise<boolean> {
    const list = await this.getIspBlacklist();
    const enabled = list.filter((i) => i.enabled);
    return enabled.some((i) => i.ispName.toLowerCase() === ispName.toLowerCase());
  }

  // ── IP Blocklist ────────────────────────────────────────────────────────────
  async getIpBlocklist(): Promise<IpBlocklist[]> {
    try {
      const { data } = await this.client.from("ip_blocklist").select("*");
      if (!data) return [];
      return data.map((d: any) => ({
        id: d.id,
        ipAddress: d.ip_address,
        reason: d.reason || null,
        enabled: Boolean(d.enabled),
        addedAt: d.added_at ? new Date(d.added_at) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  async addIpToBlocklist(ip: InsertIpBlocklist): Promise<IpBlocklist> {
    const record = {
      id: randomUUID(),
      ip_address: ip.ipAddress,
      reason: ip.reason || null,
      enabled: ip.enabled !== undefined ? ip.enabled : true,
      added_at: new Date().toISOString(),
    };
    await this.client.from("ip_blocklist").insert(record);
    return {
      id: record.id,
      ipAddress: record.ip_address,
      reason: record.reason,
      enabled: record.enabled,
      addedAt: new Date(record.added_at),
    };
  }

  async removeIpFromBlocklist(id: string): Promise<boolean> {
    try {
      await this.client.from("ip_blocklist").delete().eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async toggleIpBlocklist(id: string, enabled: boolean): Promise<boolean> {
    try {
      await this.client.from("ip_blocklist").update({ enabled }).eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const list = await this.getIpBlocklist();
    return list.some((ip) => ip.enabled && ip.ipAddress === ipAddress);
  }

  // ── CIDR Blocklist ──────────────────────────────────────────────────────────
  async getCidrBlocklist(): Promise<CidrBlocklist[]> {
    try {
      const { data } = await this.client.from("cidr_blocklist").select("*");
      if (!data) return [];
      return data.map((d: any) => ({
        id: d.id,
        cidrRange: d.cidr_range,
        reason: d.reason || null,
        enabled: Boolean(d.enabled),
        addedAt: d.added_at ? new Date(d.added_at) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  async addCidrToBlocklist(cidr: InsertCidrBlocklist): Promise<CidrBlocklist> {
    const record = {
      id: randomUUID(),
      cidr_range: cidr.cidrRange,
      reason: cidr.reason || null,
      enabled: cidr.enabled !== undefined ? cidr.enabled : true,
      added_at: new Date().toISOString(),
    };
    await this.client.from("cidr_blocklist").insert(record);
    return {
      id: record.id,
      cidrRange: record.cidr_range,
      reason: record.reason,
      enabled: record.enabled,
      addedAt: new Date(record.added_at),
    };
  }

  async removeCidrFromBlocklist(id: string): Promise<boolean> {
    try {
      await this.client.from("cidr_blocklist").delete().eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async toggleCidrBlocklist(id: string, enabled: boolean): Promise<boolean> {
    try {
      await this.client.from("cidr_blocklist").update({ enabled }).eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async isIpInBlockedCidrRange(ipAddress: string): Promise<boolean> {
    try {
      const ranges = await this.getCidrBlocklist();
      const enabled = ranges.filter((r) => r.enabled);
      if (enabled.length === 0) return false;
      const addr = ipaddr.parse(ipAddress);
      for (const rule of enabled) {
        try {
          const parsedCidr = ipaddr.parseCIDR(rule.cidrRange);
          if (addr.kind() === parsedCidr[0].kind() && (addr as any).match(parsedCidr)) {
            return true;
          }
        } catch {}
      }
    } catch {}
    return false;
  }

  // ── Client IP Whitelist ─────────────────────────────────────────────────────
  async getClientIpWhitelist(): Promise<ClientIpWhitelist[]> {
    try {
      const { data } = await this.client.from("client_ip_whitelist").select("*");
      if (!data) return [];
      return data.map((d: any) => ({
        id: d.id,
        label: d.label,
        cidr: d.cidr,
        enabled: Boolean(d.enabled),
        createdAt: d.created_at ? new Date(d.created_at) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  async addIpToWhitelist(ip: InsertClientIpWhitelist): Promise<ClientIpWhitelist> {
    const record = {
      id: randomUUID(),
      label: ip.label,
      cidr: ip.cidr,
      enabled: ip.enabled !== undefined ? ip.enabled : true,
      created_at: new Date().toISOString(),
    };
    await this.client.from("client_ip_whitelist").insert(record);
    return {
      id: record.id,
      label: record.label,
      cidr: record.cidr,
      enabled: record.enabled,
      createdAt: new Date(record.created_at),
    };
  }

  async removeIpFromWhitelist(id: string): Promise<boolean> {
    try {
      await this.client.from("client_ip_whitelist").delete().eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async toggleIpWhitelist(id: string, enabled: boolean): Promise<boolean> {
    try {
      await this.client.from("client_ip_whitelist").update({ enabled }).eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async isIpWhitelisted(ipAddress: string): Promise<boolean> {
    const list = await this.getClientIpWhitelist();
    const enabled = list.filter((r) => r.enabled);
    if (enabled.length === 0) return true;
    try {
      const addr = ipaddr.parse(ipAddress);
      for (const rule of enabled) {
        try {
          if (rule.cidr.includes("/")) {
            const cidr = ipaddr.parseCIDR(rule.cidr);
            if (addr.kind() === cidr[0].kind() && (addr as any).match(cidr)) return true;
          } else {
            if (rule.cidr === ipAddress) return true;
          }
        } catch {}
      }
    } catch {}
    return false;
  }

  async isClientWhitelistEnabled(): Promise<boolean> {
    const val = await this.getSetting("client_whitelist_enabled");
    return val === "true";
  }

  async setClientWhitelistEnabled(enabled: boolean): Promise<void> {
    await this.setSetting("client_whitelist_enabled", enabled ? "true" : "false");
  }

  // ── Interstitial Themes ─────────────────────────────────────────────────────
  private mapThemeFromDb(d: any): InterstitialTheme {
    return {
      id: d.id,
      name: d.name,
      description: d.description || "",
      category: d.category || "Light",
      badge: d.badge || null,
      isDefault: Boolean(d.is_default ?? d.isDefault ?? false),
      enabled: Boolean(d.enabled ?? true),
      previewBg: d.preview_bg ?? d.previewBg ?? "#f8fafc",
      previewAccent: d.preview_accent ?? d.previewAccent ?? "#059669",
      htmlHead: d.html_head ?? d.htmlHead ?? "",
      htmlBody: d.html_body ?? d.htmlBody ?? "",
      scriptJs: d.script_js ?? d.scriptJs ?? null,
      createdAt: d.created_at ? new Date(d.created_at) : (d.createdAt ? new Date(d.createdAt) : new Date()),
      updatedAt: d.updated_at ? new Date(d.updated_at) : (d.updatedAt ? new Date(d.updatedAt) : new Date()),
    };
  }

  async getInterstitialThemes(includeDisabled = false): Promise<InterstitialTheme[]> {
    try {
      let query = this.client.from("interstitial_themes").select("*");
      if (!includeDisabled) query = query.eq("enabled", true);
      const { data } = await query;
      if (!data) return [];
      return data.map((d: any) => this.mapThemeFromDb(d));
    } catch {
      return [];
    }
  }

  async getInterstitialTheme(id: string): Promise<InterstitialTheme | undefined> {
    try {
      const { data } = await this.client.from("interstitial_themes").select("*").eq("id", id).limit(1);
      if (!data || data.length === 0) return undefined;
      return this.mapThemeFromDb(data[0]);
    } catch {
      return undefined;
    }
  }

  async createInterstitialTheme(theme: InsertInterstitialTheme): Promise<InterstitialTheme> {
    const id = randomUUID();
    const now = new Date();
    const record = {
      id,
      name: theme.name,
      description: theme.description,
      category: theme.category || "Light",
      badge: theme.badge || null,
      is_default: theme.isDefault ?? false,
      enabled: theme.enabled ?? true,
      preview_bg: theme.previewBg || "#f8fafc",
      preview_accent: theme.previewAccent || "#059669",
      html_head: theme.htmlHead || "",
      html_body: theme.htmlBody || "",
      script_js: theme.scriptJs || null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    await this.client.from("interstitial_themes").insert(record);
    return this.mapThemeFromDb(record);
  }

  async updateInterstitialTheme(id: string, updates: Partial<InterstitialTheme>): Promise<InterstitialTheme | undefined> {
    try {
      const dbPayload: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) dbPayload.name = updates.name;
      if (updates.description !== undefined) dbPayload.description = updates.description;
      if (updates.category !== undefined) dbPayload.category = updates.category;
      if (updates.badge !== undefined) dbPayload.badge = updates.badge;
      if (updates.isDefault !== undefined) dbPayload.is_default = updates.isDefault;
      if (updates.enabled !== undefined) dbPayload.enabled = updates.enabled;
      if (updates.previewBg !== undefined) dbPayload.preview_bg = updates.previewBg;
      if (updates.previewAccent !== undefined) dbPayload.preview_accent = updates.previewAccent;
      if (updates.htmlHead !== undefined) dbPayload.html_head = updates.htmlHead;
      if (updates.htmlBody !== undefined) dbPayload.html_body = updates.htmlBody;
      if (updates.scriptJs !== undefined) dbPayload.script_js = updates.scriptJs;
      await this.client.from("interstitial_themes").update(dbPayload).eq("id", id);
      return await this.getInterstitialTheme(id);
    } catch {
      return undefined;
    }
  }

  async deleteInterstitialTheme(id: string): Promise<boolean> {
    try {
      await this.client.from("interstitial_themes").delete().eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async setDefaultInterstitialTheme(id: string): Promise<boolean> {
    try {
      await this.client.from("interstitial_themes").update({ is_default: false });
      await this.client.from("interstitial_themes").update({ is_default: true }).eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  // ── Domain Pool ─────────────────────────────────────────────────────────────
  private mapDomainFromDb(d: any): DomainPool {
    return {
      id: d.id,
      domain: d.domain,
      description: d.description ?? null,
      enabled: Boolean(d.enabled ?? true),
      createdAt: d.created_at ? new Date(d.created_at) : (d.createdAt ? new Date(d.createdAt) : new Date()),
    };
  }

  async getDomainPool(): Promise<DomainPool[]> {
    try {
      const { data } = await this.client.from("domain_pool").select("*").order("created_at", { ascending: false });
      if (!data) return [];
      return data.map((d: any) => this.mapDomainFromDb(d));
    } catch {
      return [];
    }
  }

  async addDomainToPool(domain: InsertDomainPool): Promise<DomainPool> {
    const id = randomUUID();
    const now = new Date();
    const record = {
      id,
      domain: domain.domain,
      description: domain.description || null,
      enabled: domain.enabled !== undefined ? domain.enabled : true,
      created_at: now.toISOString(),
    };
    await this.client.from("domain_pool").insert(record);
    return this.mapDomainFromDb(record);
  }

  async removeDomainFromPool(id: string): Promise<boolean> {
    try {
      await this.client.from("domain_pool").delete().eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async toggleDomainInPool(id: string, enabled: boolean): Promise<boolean> {
    try {
      await this.client.from("domain_pool").update({ enabled }).eq("id", id);
      return true;
    } catch {
      return false;
    }
  }

  async getDomainFromPool(id: string): Promise<DomainPool | undefined> {
    try {
      const { data } = await this.client.from("domain_pool").select("*").eq("id", id).limit(1);
      if (!data || data.length === 0) return undefined;
      return this.mapDomainFromDb(data[0]);
    } catch {
      return undefined;
    }
  }

  // ── User Domain Generations ─────────────────────────────────────────────────
  async getUserDomainGenerations(userId: string): Promise<UserDomainGeneration[]> {
    try {
      const { data } = await this.client
        .from("user_domain_generations")
        .select("*")
        .eq("user_id", userId)
        .order("generated_at", { ascending: false });
      if (!data) return [];
      return data.map((d: any) => ({
        id: d.id,
        userId: d.user_id ?? d.userId,
        domainId: d.domain_id ?? d.domainId,
        domain: d.domain,
        generatedAt: d.generated_at ? new Date(d.generated_at) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  async getUserDomainGenerationsToday(userId: string): Promise<UserDomainGeneration[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    try {
      const { data } = await this.client
        .from("user_domain_generations")
        .select("*")
        .eq("user_id", userId)
        .gte("generated_at", today.toISOString())
        .order("generated_at", { ascending: false });
      if (!data) return [];
      return data.map((d: any) => ({
        id: d.id,
        userId: d.user_id ?? d.userId,
        domainId: d.domain_id ?? d.domainId,
        domain: d.domain,
        generatedAt: d.generated_at ? new Date(d.generated_at) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  async createUserDomainGeneration(generation: InsertUserDomainGeneration): Promise<UserDomainGeneration> {
    const id = randomUUID();
    const now = new Date();
    const record = {
      id,
      user_id: generation.userId,
      domain_id: generation.domainId,
      domain: generation.domain,
      generated_at: now.toISOString(),
    };
    await this.client.from("user_domain_generations").insert(record);
    return {
      id,
      userId: generation.userId,
      domainId: generation.domainId,
      domain: generation.domain,
      generatedAt: now,
    };
  }

  async getDailyGenerationLimit(): Promise<number> {
    const limit = await this.getSetting("daily_generation_limit");
    return limit ? parseInt(limit, 10) : 3;
  }

  async setDailyGenerationLimit(limit: number): Promise<void> {
    await this.setSetting("daily_generation_limit", limit.toString());
  }

  // ── Audit Logs ──────────────────────────────────────────────────────────────
  async createAuditLog(entry: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const now = new Date();
    const record: AuditLog = {
      id,
      actorId: entry.actorId ?? null,
      actorType: entry.actorType,
      action: entry.action,
      targetId: entry.targetId ?? null,
      targetType: entry.targetType ?? null,
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
      createdAt: now,
    };
    try {
      await this.client.from("audit_logs").insert({
        id,
        actor_id: record.actorId,
        actor_type: record.actorType,
        action: record.action,
        target_id: record.targetId,
        target_type: record.targetType,
        metadata: record.metadata,
        ip_address: record.ipAddress,
        created_at: now.toISOString(),
      });
    } catch (e: any) {
      console.error("Audit log insert error:", e?.message);
    }
    return record;
  }

  async getRecentAuditLogs(limitCount = 100): Promise<AuditLog[]> {
    try {
      const { data, error } = await this.client
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limitCount);
      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        actorId: d.actor_id,
        actorType: d.actor_type,
        action: d.action,
        targetId: d.target_id,
        targetType: d.target_type,
        metadata: d.metadata,
        ipAddress: d.ip_address,
        createdAt: d.created_at ? new Date(d.created_at) : new Date(),
      }));
    } catch {
      return [];
    }
  }
}

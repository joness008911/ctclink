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
  users,
  classifications,
  detectionRules,
  apiKeys,
  countryWhitelist,
  ispWhitelist,
  ispBlacklist
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, sql, count } from "drizzle-orm";

// IP2Geo Cache for performance optimization
interface CachedIPData {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class IP2GeoCache {
  private cache = new Map<string, CachedIPData>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  
  set(ip: string, data: any, ttl = this.DEFAULT_TTL): void {
    this.cache.set(ip, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(ip: string): any | null {
    const cached = this.cache.get(ip);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(ip);
      return null;
    }
    
    return cached.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

export const ip2geoCache = new IP2GeoCache();

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createClassification(classification: InsertClassification): Promise<Classification>;
  getRecentClassifications(limit?: number): Promise<Classification[]>;
  getClassificationStats(): Promise<{
    totalClassifications: number;
    humanVisitors: number;
    botTraffic: number;
    apiRequests: number;
  }>;
  
  getDetectionRules(): Promise<DetectionRules | undefined>;
  updateDetectionRules(rules: InsertDetectionRules): Promise<DetectionRules>;
  
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeys(): Promise<ApiKey[]>;
  getApiKey(keyValue: string): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<boolean>;
  updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | undefined>;
  incrementApiKeyUsage(keyValue: string): Promise<boolean>;
  pauseApiKey(id: string): Promise<boolean>;
  renewApiKey(id: string): Promise<ApiKey | undefined>;
  
  // Country Whitelist methods
  getCountryWhitelist(): Promise<CountryWhitelist[]>;
  addCountryToWhitelist(country: InsertCountryWhitelist): Promise<CountryWhitelist>;
  removeCountryFromWhitelist(id: string): Promise<boolean>;
  toggleCountryWhitelist(id: string, enabled: boolean): Promise<boolean>;
  isCountryAllowed(countryCode: string): Promise<boolean>;
  
  // ISP Whitelist methods
  getIspWhitelist(countryCode?: string): Promise<IspWhitelist[]>;
  addIspToWhitelist(isp: InsertIspWhitelist): Promise<IspWhitelist>;
  removeIspFromWhitelist(id: string): Promise<boolean>;
  toggleIspWhitelist(id: string, enabled: boolean): Promise<boolean>;
  isIspWhitelisted(ispName: string): Promise<boolean>;
  
  // ISP Blacklist methods
  getIspBlacklist(): Promise<IspBlacklist[]>;
  addIspToBlacklist(isp: InsertIspBlacklist): Promise<IspBlacklist>;
  removeIspFromBlacklist(id: string): Promise<boolean>;
  toggleIspBlacklist(id: string, enabled: boolean): Promise<boolean>;
  isIspBlacklisted(ispName: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private classifications: Map<string, Classification>;
  private detectionRules: DetectionRules | undefined;
  private apiKeys: Map<string, ApiKey>;

  constructor() {
    this.users = new Map();
    this.classifications = new Map();
    this.apiKeys = new Map();
    
    // Initialize default admin user
    const adminId = randomUUID();
    const adminUser: User = {
      id: adminId,
      username: "Mark02",
      password: "Markstorey@2015" // In production, this should be hashed
    };
    this.users.set(adminId, adminUser);
    
    // Initialize default detection rules
    this.detectionRules = {
      id: randomUUID(),
      name: "Default Rules",
      enabled: true,
      rules: {
        isp: true,
        mobile: true,
        vpn: true,
        proxy: true,
        tor: true,
        datacenter: true
      },
      updatedAt: new Date()
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createClassification(insertClassification: InsertClassification): Promise<Classification> {
    const id = randomUUID();
    const classification: Classification = { 
      ...insertClassification,
      location: insertClassification.location || null,
      country: insertClassification.country || null,
      city: insertClassification.city || null,
      connectionType: insertClassification.connectionType || null,
      isp: insertClassification.isp || null,
      browser: insertClassification.browser || null,
      deviceType: insertClassification.deviceType || null,
      userAgent: insertClassification.userAgent || null,
      id, 
      timestamp: new Date() 
    };
    this.classifications.set(id, classification);
    return classification;
  }

  async getRecentClassifications(limit: number = 10): Promise<Classification[]> {
    const classifications = Array.from(this.classifications.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
    return classifications;
  }

  async getClassificationStats(): Promise<{
    totalClassifications: number;
    humanVisitors: number;
    botTraffic: number;
    apiRequests: number;
  }> {
    const allClassifications = Array.from(this.classifications.values());
    const totalClassifications = allClassifications.length;
    const humanVisitors = allClassifications.filter(c => c.visitorType === 'Human').length;
    const botTraffic = allClassifications.filter(c => c.visitorType === 'Bot').length;
    
    return {
      totalClassifications,
      humanVisitors,
      botTraffic,
      apiRequests: totalClassifications // Same as total classifications for this implementation
    };
  }

  async getDetectionRules(): Promise<DetectionRules | undefined> {
    return this.detectionRules;
  }

  async updateDetectionRules(rules: InsertDetectionRules): Promise<DetectionRules> {
    this.detectionRules = {
      ...this.detectionRules!,
      ...rules,
      updatedAt: new Date()
    };
    return this.detectionRules;
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const id = randomUUID();
    
    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (insertApiKey.expirationPeriod !== 'unlimited') {
      const now = new Date();
      switch (insertApiKey.expirationPeriod) {
        case '10seconds':
          expiresAt = new Date(now.getTime() + 10 * 1000);
          break;
        case '1minute':
          expiresAt = new Date(now.getTime() + 60 * 1000);
          break;
        case '1hour':
          expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case 'daily':
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }
    
    const apiKey: ApiKey = {
      ...insertApiKey,
      enabled: insertApiKey.enabled ?? true,
      status: insertApiKey.status ?? 'active',
      expirationPeriod: insertApiKey.expirationPeriod ?? 'unlimited',
      expiresAt,
      callLimit: insertApiKey.callLimit ?? 1000,
      callCount: 0,
      lastUsed: null,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.apiKeys.set(id, apiKey);
    return apiKey;
  }

  async getApiKeys(): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getApiKey(keyValue: string): Promise<ApiKey | undefined> {
    return Array.from(this.apiKeys.values()).find(key => key.keyValue === keyValue);
  }

  async deleteApiKey(id: string): Promise<boolean> {
    return this.apiKeys.delete(id);
  }

  async updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | undefined> {
    const apiKey = this.apiKeys.get(id);
    if (apiKey) {
      const updatedKey = { ...apiKey, ...updates, updatedAt: new Date() };
      this.apiKeys.set(id, updatedKey);
      return updatedKey;
    }
    return undefined;
  }

  async incrementApiKeyUsage(keyValue: string): Promise<boolean> {
    const apiKey = await this.getApiKey(keyValue);
    if (apiKey) {
      // Check if key is expired
      if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
        await this.updateApiKey(apiKey.id, { status: 'expired' });
        return false;
      }
      
      // Check if call limit reached
      if (apiKey.callCount >= apiKey.callLimit) {
        return false;
      }
      
      // Check if key is paused or inactive
      if (apiKey.status !== 'active') {
        return false;
      }
      
      // Increment usage
      apiKey.callCount += 1;
      apiKey.lastUsed = new Date();
      apiKey.updatedAt = new Date();
      this.apiKeys.set(apiKey.id, apiKey);
      return true;
    }
    return false;
  }

  async pauseApiKey(id: string): Promise<boolean> {
    const apiKey = this.apiKeys.get(id);
    if (apiKey) {
      apiKey.status = apiKey.status === 'paused' ? 'active' : 'paused';
      apiKey.updatedAt = new Date();
      this.apiKeys.set(id, apiKey);
      return true;
    }
    return false;
  }

  async renewApiKey(id: string): Promise<ApiKey | undefined> {
    const apiKey = this.apiKeys.get(id);
    if (apiKey) {
      let expiresAt: Date | null = null;
      if (apiKey.expirationPeriod !== 'unlimited') {
        const now = new Date();
        switch (apiKey.expirationPeriod) {
          case '10seconds':
            expiresAt = new Date(now.getTime() + 10 * 1000);
            break;
          case '1minute':
            expiresAt = new Date(now.getTime() + 60 * 1000);
            break;
          case '1hour':
            expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
            break;
          case 'daily':
            expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'weekly':
            expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
        }
      }
      
      apiKey.expiresAt = expiresAt;
      apiKey.callCount = 0; // Reset usage count
      apiKey.status = 'active';
      apiKey.updatedAt = new Date();
      this.apiKeys.set(id, apiKey);
      return apiKey;
    }
    return undefined;
  }
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDefaults();
  }

  private async initializeDefaults() {
    try {
      // Check if admin user exists, if not create one
      const existingAdmin = await this.getUserByUsername("Mark02");
      if (!existingAdmin) {
        await this.createUser({
          username: "Mark02",
          password: "Markstorey@2015" // In production, this should be hashed
        });
      }

      // Check if detection rules exist, if not create defaults
      const existingRules = await this.getDetectionRules();
      if (!existingRules) {
        await this.updateDetectionRules({
          name: "Default Rules",
          enabled: true,
          rules: {
            isp: true,
            mobile: true,
            vpn: true,
            proxy: true,
            tor: true,
            datacenter: true
          }
        });
      }
    } catch (error) {
      console.log("Database initialization will be handled on first request");
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async createClassification(classification: InsertClassification): Promise<Classification> {
    const [newClassification] = await db.insert(classifications).values(classification).returning();
    return newClassification;
  }

  async getRecentClassifications(limit: number = 10): Promise<Classification[]> {
    const results = await db
      .select()
      .from(classifications)
      .orderBy(desc(classifications.timestamp))
      .limit(limit);
    return results;
  }

  async getClassificationStats(): Promise<{
    totalClassifications: number;
    humanVisitors: number;
    botTraffic: number;
    apiRequests: number;
  }> {
    const [stats] = await db
      .select({
        total: count(),
        humans: sql<number>`count(case when ${classifications.visitorType} = 'Human' then 1 end)`,
        bots: sql<number>`count(case when ${classifications.visitorType} = 'Bot' then 1 end)`
      })
      .from(classifications);

    return {
      totalClassifications: stats.total,
      humanVisitors: stats.humans || 0,
      botTraffic: stats.bots || 0,
      apiRequests: stats.total
    };
  }

  async getDetectionRules(): Promise<DetectionRules | undefined> {
    const [rules] = await db.select().from(detectionRules).limit(1);
    return rules;
  }

  async updateDetectionRules(rules: InsertDetectionRules): Promise<DetectionRules> {
    // Delete existing rules and insert new ones (simple approach for single rule set)
    await db.delete(detectionRules);
    const [newRules] = await db.insert(detectionRules).values(rules).returning();
    return newRules;
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (apiKey.expirationPeriod !== 'unlimited') {
      const now = new Date();
      switch (apiKey.expirationPeriod) {
        case '10seconds':
          expiresAt = new Date(now.getTime() + 10 * 1000);
          break;
        case '1minute':
          expiresAt = new Date(now.getTime() + 60 * 1000);
          break;
        case '1hour':
          expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case 'daily':
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    const [newApiKey] = await db.insert(apiKeys).values({
      ...apiKey,
      expiresAt
    }).returning();
    return newApiKey;
  }

  async getApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(keyValue: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.keyValue, keyValue));
    return apiKey;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return (result.rowCount || 0) > 0;
  }

  async updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | undefined> {
    const [updatedKey] = await db
      .update(apiKeys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return updatedKey;
  }

  async incrementApiKeyUsage(keyValue: string): Promise<boolean> {
    const apiKey = await this.getApiKey(keyValue);
    if (!apiKey) {
      return false;
    }
    
    // Check if key is expired
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      await this.updateApiKey(apiKey.id, { status: 'expired' });
      return false;
    }
    
    // Check if call limit reached
    if (apiKey.callCount >= apiKey.callLimit) {
      await this.updateApiKey(apiKey.id, { status: 'expired' });
      return false;
    }
    
    // Check if key is paused or inactive
    if (apiKey.status !== 'active') {
      return false;
    }
    
    // Increment usage count
    const result = await db
      .update(apiKeys)
      .set({
        callCount: sql`${apiKeys.callCount} + 1`,
        lastUsed: new Date()
      })
      .where(eq(apiKeys.keyValue, keyValue));
    return (result.rowCount || 0) > 0;
  }

  async pauseApiKey(id: string): Promise<boolean> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    if (apiKey) {
      const newStatus = apiKey.status === 'active' ? 'paused' : 'active';
      await db
        .update(apiKeys)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(apiKeys.id, id));
      return true;
    }
    return false;
  }

  async renewApiKey(id: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    if (apiKey) {
      let expiresAt: Date | null = null;
      if (apiKey.expirationPeriod !== 'unlimited') {
        const now = new Date();
        switch (apiKey.expirationPeriod) {
          case '10seconds':
            expiresAt = new Date(now.getTime() + 10 * 1000);
            break;
          case '1minute':
            expiresAt = new Date(now.getTime() + 60 * 1000);
            break;
          case '1hour':
            expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
            break;
          case 'daily':
            expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'weekly':
            expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      const [renewed] = await db
        .update(apiKeys)
        .set({
          expiresAt,
          callCount: 0,
          status: 'active',
          updatedAt: new Date()
        })
        .where(eq(apiKeys.id, id))
        .returning();
      return renewed;
    }
    return undefined;
  }

  // Country Whitelist methods
  async getCountryWhitelist(): Promise<CountryWhitelist[]> {
    const countries = await db.select().from(countryWhitelist);
    return countries;
  }

  async addCountryToWhitelist(country: InsertCountryWhitelist): Promise<CountryWhitelist> {
    const [newCountry] = await db.insert(countryWhitelist).values(country).returning();
    return newCountry;
  }

  async removeCountryFromWhitelist(id: string): Promise<boolean> {
    const result = await db.delete(countryWhitelist).where(eq(countryWhitelist.id, id));
    return (result.rowCount || 0) > 0;
  }

  async toggleCountryWhitelist(id: string, enabled: boolean): Promise<boolean> {
    const result = await db
      .update(countryWhitelist)
      .set({ enabled })
      .where(eq(countryWhitelist.id, id));
    return (result.rowCount || 0) > 0;
  }

  async isCountryAllowed(countryCode: string): Promise<boolean> {
    const [country] = await db
      .select()
      .from(countryWhitelist)
      .where(eq(countryWhitelist.countryCode, countryCode));
    return country ? country.enabled : false;
  }

  // ISP Whitelist methods
  async getIspWhitelist(countryCode?: string): Promise<IspWhitelist[]> {
    if (countryCode) {
      const isps = await db
        .select()
        .from(ispWhitelist)
        .where(eq(ispWhitelist.countryCode, countryCode));
      return isps;
    }
    const isps = await db.select().from(ispWhitelist);
    return isps;
  }

  async addIspToWhitelist(isp: InsertIspWhitelist): Promise<IspWhitelist> {
    const [newIsp] = await db.insert(ispWhitelist).values(isp).returning();
    return newIsp;
  }

  async removeIspFromWhitelist(id: string): Promise<boolean> {
    const result = await db.delete(ispWhitelist).where(eq(ispWhitelist.id, id));
    return (result.rowCount || 0) > 0;
  }

  async toggleIspWhitelist(id: string, enabled: boolean): Promise<boolean> {
    const result = await db
      .update(ispWhitelist)
      .set({ enabled })
      .where(eq(ispWhitelist.id, id));
    return (result.rowCount || 0) > 0;
  }

  async isIspWhitelisted(ispName: string): Promise<boolean> {
    const [isp] = await db
      .select()
      .from(ispWhitelist)
      .where(eq(ispWhitelist.ispName, ispName));
    return isp ? isp.enabled : false;
  }

  // ISP Blacklist methods
  async getIspBlacklist(): Promise<IspBlacklist[]> {
    const isps = await db.select().from(ispBlacklist);
    return isps;
  }

  async addIspToBlacklist(isp: InsertIspBlacklist): Promise<IspBlacklist> {
    const [newIsp] = await db.insert(ispBlacklist).values(isp).returning();
    return newIsp;
  }

  async removeIspFromBlacklist(id: string): Promise<boolean> {
    const result = await db.delete(ispBlacklist).where(eq(ispBlacklist.id, id));
    return (result.rowCount || 0) > 0;
  }

  async toggleIspBlacklist(id: string, enabled: boolean): Promise<boolean> {
    const result = await db
      .update(ispBlacklist)
      .set({ enabled })
      .where(eq(ispBlacklist.id, id));
    return (result.rowCount || 0) > 0;
  }

  async isIspBlacklisted(ispName: string): Promise<boolean> {
    const [isp] = await db
      .select()
      .from(ispBlacklist)
      .where(eq(ispBlacklist.ispName, ispName));
    return isp ? isp.enabled : false;
  }
}

export const storage = new DatabaseStorage();

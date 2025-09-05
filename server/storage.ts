import { 
  type User, 
  type InsertUser, 
  type Classification, 
  type InsertClassification,
  type DetectionRules,
  type InsertDetectionRules,
  type ApiKey,
  type InsertApiKey
} from "@shared/schema";
import { randomUUID } from "crypto";

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

export const storage = new MemStorage();

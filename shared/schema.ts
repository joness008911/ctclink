import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const classifications = pgTable("classifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull(),
  location: text("location"),
  country: text("country"),
  city: text("city"),
  visitorType: text("visitor_type").notNull(), // 'Human' or 'Bot'
  detectionMethod: text("detection_method").notNull(),
  connectionType: text("connection_type"),
  isp: text("isp"),
  browser: text("browser"),
  deviceType: text("device_type"),
  userAgent: text("user_agent"),
  email: varchar("email", { length: 255 }), // Email captured from URL parameters
  apiKeyId: varchar("api_key_id").references(() => apiKeys.id, { onDelete: 'set null' }), // Link to which API key was used
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const detectionRules = pgTable("detection_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  rules: jsonb("rules").notNull(), // JSON object with rule configuration
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyName: text("key_name").notNull(),
  keyValue: text("key_value").notNull().unique(),
  enabled: boolean("enabled").default(true).notNull(),
  status: text("status").default("active").notNull(), // active, paused, expired
  expirationPeriod: text("expiration_period").default("unlimited").notNull(), // daily, weekly, monthly, unlimited
  expiresAt: timestamp("expires_at"),
  callLimit: integer("call_limit").default(1000).notNull(),
  callCount: integer("call_count").default(0).notNull(),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const countryWhitelist = pgTable("country_whitelist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: varchar("country_code", { length: 2 }).notNull().unique(),
  countryName: varchar("country_name", { length: 100 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const ispWhitelist = pgTable("isp_whitelist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ispName: varchar("isp_name", { length: 255 }).notNull(),
  countryCode: varchar("country_code", { length: 2 }),
  enabled: boolean("enabled").default(true).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const ispBlacklist = pgTable("isp_blacklist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ispName: varchar("isp_name", { length: 255 }).notNull().unique(),
  category: varchar("category", { length: 50 }),
  enabled: boolean("enabled").default(true).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// Client Users (End-user customers who use the CleanTraffic service)
export const clientUsers = pgTable("client_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  apiKeyId: varchar("api_key_id").references(() => apiKeys.id, { onDelete: 'set null' }),
  status: text("status").default("active").notNull(), // active, suspended, expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Redirect URLs (Custom redirect URLs per user)
export const userRedirectUrls = pgTable("user_redirect_urls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => clientUsers.id, { onDelete: 'cascade' }),
  humanUrl: text("human_url").notNull().default("https://example.com/human"),
  botUrl: text("bot_url").notNull().default("https://google.com"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertClassificationSchema = createInsertSchema(classifications).omit({
  id: true,
  timestamp: true,
});

export const insertDetectionRulesSchema = createInsertSchema(detectionRules).omit({
  id: true,
  updatedAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true,
  callCount: true,
}).extend({
  expirationPeriod: z.enum(["10seconds", "1minute", "1hour", "daily", "weekly", "monthly", "unlimited"]).default("unlimited"),
  callLimit: z.number().min(1).max(100000).default(1000),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertCountryWhitelistSchema = createInsertSchema(countryWhitelist).omit({
  id: true,
  addedAt: true,
});

export const insertIspWhitelistSchema = createInsertSchema(ispWhitelist).omit({
  id: true,
  addedAt: true,
});

export const insertIspBlacklistSchema = createInsertSchema(ispBlacklist).omit({
  id: true,
  addedAt: true,
});

export const insertClientUserSchema = createInsertSchema(clientUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRedirectUrlsSchema = createInsertSchema(userRedirectUrls).omit({
  id: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClassification = z.infer<typeof insertClassificationSchema>;
export type Classification = typeof classifications.$inferSelect;
export type InsertDetectionRules = z.infer<typeof insertDetectionRulesSchema>;
export type DetectionRules = typeof detectionRules.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertCountryWhitelist = z.infer<typeof insertCountryWhitelistSchema>;
export type CountryWhitelist = typeof countryWhitelist.$inferSelect;
export type InsertIspWhitelist = z.infer<typeof insertIspWhitelistSchema>;
export type IspWhitelist = typeof ispWhitelist.$inferSelect;
export type InsertIspBlacklist = z.infer<typeof insertIspBlacklistSchema>;
export type IspBlacklist = typeof ispBlacklist.$inferSelect;
export type InsertClientUser = z.infer<typeof insertClientUserSchema>;
export type ClientUser = typeof clientUsers.$inferSelect;
export type InsertUserRedirectUrls = z.infer<typeof insertUserRedirectUrlsSchema>;
export type UserRedirectUrls = typeof userRedirectUrls.$inferSelect;

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
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
  usageCount: text("usage_count").default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClassification = z.infer<typeof insertClassificationSchema>;
export type Classification = typeof classifications.$inferSelect;
export type InsertDetectionRules = z.infer<typeof insertDetectionRulesSchema>;
export type DetectionRules = typeof detectionRules.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

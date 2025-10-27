import type { Express } from "express";

// Extend session types
declare module 'express-session' {
  interface SessionData {
    userId?: string; // Admin user ID
    clientUserId?: string; // Client user ID (end-user customers)
    clientUserAuthenticated?: boolean; // Whether client user has verified API key
  }
}
import { createServer, type Server } from "http";
import { storage, ip2geoCache } from "./storage";
import { db } from "./db";
import session from "express-session";
import { insertClassificationSchema } from "@shared/schema";
import { UAParser } from "ua-parser-js";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy to get real client IP
  app.set('trust proxy', true);
  
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'antibot-detection-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  
  // Smart routing: Detect API subdomain and redirect browsers
  // IMPORTANT: This runs AFTER session/body parsing so API key validation works properly
  app.use((req, res, next) => {
    const host = req.headers.host || '';
    
    // Check if accessing from api.* subdomain
    if (host.startsWith('api.')) {
      // Allow GET, POST, OPTIONS, and HEAD requests to /api/classify (with query strings)
      // GET = Public classification endpoint
      // POST = PHP script API calls with request body
      // OPTIONS = CORS preflight requests
      // HEAD = Health checks
      // req.path excludes query string, so /api/classify?source=widget works
      const allowedMethods = ['GET', 'POST', 'OPTIONS', 'HEAD'];
      if (allowedMethods.includes(req.method) && req.path === '/api/classify') {
        return next(); // Let it proceed to normal API key validation and CORS handling
      }
      
      // Redirect ALL other browser requests to Google.com (privacy/security)
      // This prevents access to /dashboard, /admin, /api/*, assets, etc. on api subdomain
      // Anyone typing api.yoursite.com in browser gets redirected away
      return res.redirect(301, 'https://www.google.com');
    }
    
    // Continue to normal routes for non-api subdomains
    next();
  });

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session?.userId) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };

  // Download endpoint for PHP package (working version)
  app.get("/download/cleantraffic-php-package", (req, res) => {
    const filePath = path.join(process.cwd(), 'CleanTraffic-PHP-Package-Working.tar.gz');
    res.download(filePath, 'CleanTraffic-PHP-Package-Working.tar.gz', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(404).json({ message: "File not found" });
      }
    });
  });

  // Direct download endpoint for working package
  app.get("/CleanTraffic-PHP-Package-Working.tar.gz", (req, res) => {
    const filePath = path.join(process.cwd(), 'CleanTraffic-PHP-Package-Working.tar.gz');
    res.download(filePath, 'CleanTraffic-PHP-Package-Working.tar.gz', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(404).json({ message: "File not found" });
      }
    });
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      req.session.userId = user.id;
      res.json({ message: "Login successful", user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user (Admin)
  app.get("/api/auth/user", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ========== CLIENT USER AUTHENTICATION ROUTES ==========
  
  // Step 1: Client user login with username/password
  app.post("/api/user/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      // Find client user by username
      const user = await storage.getClientUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Use bcrypt to compare passwords
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user account is active
      if (user.status !== 'active') {
        return res.status(403).json({ message: `Account is ${user.status}. Please contact support.` });
      }
      
      // Store user ID in session for step 2
      req.session.clientUserId = user.id;
      
      res.json({ 
        message: "Login successful. Please verify your API key.", 
        userId: user.id,
        username: user.username,
        requiresApiKey: true
      });
    } catch (error) {
      console.error("Client user login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Step 2: Verify API key for client user
  app.post("/api/user/verify-api-key", async (req, res) => {
    try {
      const { apiKey } = req.body;
      const clientUserId = req.session.clientUserId;
      
      if (!clientUserId) {
        return res.status(401).json({ message: "Please login first" });
      }

      if (!apiKey) {
        return res.status(400).json({ message: "API key required" });
      }
      
      // Find the API key in the system
      const apiKeyRecord = await storage.getApiKeyByValue(apiKey);
      if (!apiKeyRecord) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      // Verify this API key belongs to this user
      const user = await storage.getClientUser(clientUserId);
      if (!user || user.apiKeyId !== apiKeyRecord.id) {
        return res.status(403).json({ message: "API key does not match your account" });
      }

      // Check API key status
      if (apiKeyRecord.status === 'paused') {
        return res.status(403).json({ message: "API key is paused" });
      }
      if (apiKeyRecord.status === 'expired') {
        return res.status(403).json({ message: "API key has expired" });
      }

      // Success! Mark user as fully authenticated
      req.session.clientUserAuthenticated = true;
      
      res.json({ 
        message: "API key verified successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status
        },
        apiKey: {
          name: apiKeyRecord.keyName,
          status: apiKeyRecord.status,
          expirationPeriod: apiKeyRecord.expirationPeriod
        }
      });
    } catch (error) {
      console.error("API key verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Middleware for client user auth
  const requireClientAuth = (req: any, res: any, next: any) => {
    if (req.session?.clientUserId && req.session?.clientUserAuthenticated) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized. Please login and verify your API key." });
    }
  };

  // Get current client user info
  app.get("/api/user/me", requireClientAuth, async (req: any, res) => {
    try {
      const user = await storage.getClientUser(req.session.clientUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get API key info
      const apiKey = user.apiKeyId ? await storage.getApiKeyById(user.apiKeyId) : null;
      
      res.json({ 
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt,
        apiKey: apiKey ? {
          name: apiKey.keyName,
          status: apiKey.status,
          expirationPeriod: apiKey.expirationPeriod,
          callLimit: apiKey.callLimit
        } : null
      });
    } catch (error) {
      console.error("Get client user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Client user logout
  app.post("/api/user/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Get client user's redirect URLs
  app.get("/api/user/redirect-urls", requireClientAuth, async (req: any, res) => {
    try {
      const userId = req.session.clientUserId;
      const redirectUrls = await storage.getUserRedirectUrls(userId);
      
      res.json(redirectUrls || { 
        humanUrl: "https://example.com/human", 
        botUrl: "https://google.com" 
      });
    } catch (error) {
      console.error("Get user redirect URLs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update client user's redirect URLs
  app.put("/api/user/redirect-urls", requireClientAuth, async (req: any, res) => {
    try {
      const userId = req.session.clientUserId;
      const { humanUrl, botUrl } = req.body;
      
      if (!humanUrl || !botUrl) {
        return res.status(400).json({ message: "Both humanUrl and botUrl are required" });
      }

      // Basic URL validation
      try {
        new URL(humanUrl);
        new URL(botUrl);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      
      const updated = await storage.setUserRedirectUrls(userId, { humanUrl, botUrl });
      res.json(updated);
    } catch (error) {
      console.error("Update user redirect URLs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get client user's classifications (their traffic logs)
  app.get("/api/user/classifications", requireClientAuth, async (req: any, res) => {
    try {
      const user = await storage.getClientUser(req.session.clientUserId);
      if (!user || !user.apiKeyId) {
        return res.json([]);
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const classifications = await storage.getUserClassifications(user.apiKeyId, limit);
      
      res.json(classifications);
    } catch (error) {
      console.error("Get user classifications error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get client user's statistics
  app.get("/api/user/stats", requireClientAuth, async (req: any, res) => {
    try {
      const user = await storage.getClientUser(req.session.clientUserId);
      if (!user || !user.apiKeyId) {
        return res.json({
          totalClassifications: 0,
          humanVisitors: 0,
          botTraffic: 0
        });
      }

      const stats = await storage.getUserStats(user.apiKeyId);
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change client user password
  app.post("/api/user/change-password", requireClientAuth, async (req: any, res) => {
    try {
      const userId = req.session.clientUserId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const user = await storage.getClientUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password using bcrypt
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password before storing
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateClientUser(userId, { password: hashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get client user's API key details (for license management)
  app.get("/api/user/api-key-details", requireClientAuth, async (req: any, res) => {
    try {
      const user = await storage.getClientUser(req.session.clientUserId);
      if (!user || !user.apiKeyId) {
        return res.json(null);
      }

      const apiKey = await storage.getApiKeyById(user.apiKeyId);
      if (!apiKey) {
        return res.json(null);
      }

      // Return masked key and details
      const keyValue = apiKey.keyValue;
      const masked = keyValue.length > 8 
        ? `${keyValue.substring(0, 4)}${'*'.repeat(keyValue.length - 8)}${keyValue.substring(keyValue.length - 4)}`
        : '****';

      res.json({
        keyName: apiKey.keyName,
        keyPreview: masked,
        status: apiKey.status,
        callLimit: apiKey.callLimit,
        callCount: apiKey.callCount,
        expirationPeriod: apiKey.expirationPeriod,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      });
    } catch (error) {
      console.error("Get API key details error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get client user's full API key value (for PHP script generation)
  app.get("/api/user/api-key-value", requireClientAuth, async (req: any, res) => {
    try {
      const user = await storage.getClientUser(req.session.clientUserId);
      if (!user || !user.apiKeyId) {
        return res.json({ keyValue: null });
      }

      const apiKey = await storage.getApiKeyById(user.apiKeyId);
      if (!apiKey) {
        return res.json({ keyValue: null });
      }

      // Return full key value (user needs this for PHP script)
      res.json({ keyValue: apiKey.keyValue });
    } catch (error) {
      console.error("Get API key value error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ========== END CLIENT USER ROUTES ==========

  // ========== ADMIN CLIENT USER MANAGEMENT ROUTES ==========
  
  // Get all client users (Admin only)
  app.get("/api/admin/client-users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllClientUsers();
      res.json(users);
    } catch (error) {
      console.error("Get client users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a client user (Admin only)
  app.post("/api/admin/client-users", requireAuth, async (req, res) => {
    try {
      const { username, password, email, apiKeyId } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Check if username already exists
      const existingUser = await storage.getClientUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // If apiKeyId is provided, verify it exists
      if (apiKeyId) {
        const apiKey = await storage.getApiKeyById(apiKeyId);
        if (!apiKey) {
          return res.status(400).json({ message: "Invalid API key ID" });
        }
      }

      // Hash password before storing
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await storage.createClientUser({
        username,
        password: hashedPassword,
        email: email || null,
        apiKeyId: apiKeyId || null,
        status: 'active'
      });

      res.json(newUser);
    } catch (error) {
      console.error("Create client user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete a client user (Admin only)
  app.delete("/api/admin/client-users/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const user = await storage.getClientUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // For now, we don't have a delete method, so we'll suspend the user instead
      const updated = await storage.updateClientUser(id, { status: 'suspended' });
      
      res.json({ message: "User suspended", user: updated });
    } catch (error) {
      console.error("Delete client user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ========== END ADMIN CLIENT USER MANAGEMENT ROUTES ==========

  // ========== WHITE-LABEL DOMAIN SETTINGS ==========
  
  // Get white-label domain setting
  app.get("/api/admin/whitelabel-domain", requireAuth, async (req, res) => {
    try {
      const domain = await storage.getSetting('whitelabel_domain');
      res.json({ domain: domain || '' });
    } catch (error) {
      console.error("Get white-label domain error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Set white-label domain setting
  app.post("/api/admin/whitelabel-domain", requireAuth, async (req, res) => {
    try {
      const { domain } = req.body;
      
      if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ message: "Domain is required" });
      }
      
      await storage.setSetting('whitelabel_domain', domain);
      res.json({ message: "White-label domain updated successfully", domain });
    } catch (error) {
      console.error("Set white-label domain error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get white-label domain (public - for user dashboard PHP script generation)
  app.get("/api/whitelabel-domain", async (req, res) => {
    try {
      const domain = await storage.getSetting('whitelabel_domain');
      res.json({ domain: domain || '' });
    } catch (error) {
      console.error("Get white-label domain error:", error);
      // Fallback to empty string if not set
      res.json({ domain: '' });
    }
  });
  
  // ========== END WHITE-LABEL DOMAIN SETTINGS ==========

  // Get API keys (protected)
  app.get("/api/api-keys", requireAuth, async (req, res) => {
    try {
      const apiKeys = await storage.getApiKeys();
      res.json(apiKeys);
    } catch (error) {
      console.error("Get API keys error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create API key (protected)
  app.post("/api/api-keys", requireAuth, async (req, res) => {
    try {
      const { keyName, keyValue, expirationPeriod, callLimit } = req.body;
      
      if (!keyName || !keyValue) {
        return res.status(400).json({ message: "Key name and value are required" });
      }

      // Validate expirationPeriod
      const validPeriods = ['10seconds', '1minute', '1hour', 'daily', 'weekly', 'monthly', 'unlimited'];
      const period = expirationPeriod || 'unlimited';
      if (!validPeriods.includes(period)) {
        return res.status(400).json({ message: "Invalid expiration period" });
      }

      // Validate callLimit (allow low limits for testing)
      const limit = parseInt(callLimit) || 1000;
      if (limit < 1 || limit > 100000) {
        return res.status(400).json({ message: "Call limit must be between 1 and 100,000" });
      }

      // Check if key value already exists
      const existingKey = await storage.getApiKey(keyValue);
      if (existingKey) {
        return res.status(400).json({ message: "API key value already exists" });
      }

      const apiKey = await storage.createApiKey({
        keyName,
        keyValue,
        expirationPeriod: period,
        callLimit: limit
      });

      res.json(apiKey);
    } catch (error) {
      console.error("Create API key error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete API key (protected)
  app.delete("/api/api-keys/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteApiKey(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      console.error("Delete API key error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Pause/Resume API key (protected)
  app.post("/api/api-keys/:id/pause", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const paused = await storage.pauseApiKey(id);
      
      if (!paused) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      res.json({ message: "API key paused successfully" });
    } catch (error) {
      console.error("Pause API key error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Resume API key (protected)
  app.post("/api/api-keys/:id/resume", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const resumed = await storage.pauseApiKey(id); // pauseApiKey toggles, so it resumes paused keys
      
      if (!resumed) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      res.json({ message: "API key resumed successfully" });
    } catch (error) {
      console.error("Resume API key error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Renew API key (protected)
  app.post("/api/api-keys/:id/renew", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const renewed = await storage.renewApiKey(id);
      
      if (!renewed) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      res.json(renewed);
    } catch (error) {
      console.error("Renew API key error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Classification endpoint (GET with API key support)
  app.get("/api/classify", async (req, res) => {
    // Support both formats: ?api_key=XXX or just the first query param value
    let apiKey = req.query.api_key as string;
    
    // If api_key not provided, check if first query param is the key itself (backward compatibility)
    if (!apiKey) {
      const queryKeys = Object.keys(req.query);
      if (queryKeys.length > 0) {
        apiKey = queryKeys[0];
      }
    }
    
    // REQUIRE API key - no anonymous classification
    // Redirect to Google for white-label security (don't reveal it's an API)
    if (!apiKey) {
      return res.redirect(301, 'https://www.google.com');
    }
    
    let limitReached = false;
    let apiKeyId: string | null = null;
    
    // Validate API key
    const validKey = await storage.getApiKey(apiKey);
    if (!validKey || !validKey.enabled) {
      return res.status(401).json({ 
        error: "Invalid or disabled API key",
        status: "unauthorized"
      });
    }
    
    // Store API key ID for classification tracking
    apiKeyId = validKey.id;
    
    // Check and increment usage count
    const usageAllowed = await storage.incrementApiKeyUsage(apiKey);
    if (!usageAllowed) {
      // Don't return error - classify as Bot instead (forces bot URL redirect)
      limitReached = true;
    }
    
    // Continue with classification logic, passing API key ID
    return handleClassification(req, res, limitReached, apiKeyId);
  });

  // Public classification endpoint (POST) - with API key support for PHP scripts
  app.post("/api/classify", async (req, res) => {
    // Check for API key in header (X-API-Key)
    const apiKeyFromHeader = req.headers['x-api-key'] as string;
    
    // REQUIRE API key - no anonymous classification
    // Redirect to Google for white-label security (don't reveal it's an API)
    if (!apiKeyFromHeader) {
      return res.redirect(301, 'https://www.google.com');
    }
    
    let limitReached = false;
    let apiKeyId: string | null = null;
    
    // Validate API key
    const validKey = await storage.getApiKey(apiKeyFromHeader);
    if (!validKey || !validKey.enabled) {
      return res.status(401).json({ 
        error: "Invalid or disabled API key",
        status: "unauthorized"
      });
    }
    
    // Store API key ID for classification tracking and redirect URL lookup
    apiKeyId = validKey.id;
    
    // Check and increment usage count
    const usageAllowed = await storage.incrementApiKeyUsage(apiKeyFromHeader);
    if (!usageAllowed) {
      limitReached = true;
    }
    
    return handleClassification(req, res, limitReached, apiKeyId);
  });

  async function handleClassification(req: any, res: any, limitReached: boolean = false, apiKeyId: string | null = null) {
    try {
      
      // Check if IP is provided in request body (POST) or query parameter (GET) or use actual visitor IP
      let clientIp = req.body?.ip as string ||
                     req.query.ip as string || 
                     req.headers['cf-connecting-ip'] || 
                     req.headers['true-client-ip'] || 
                     req.headers['x-client-ip'] || 
                     req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.headers['fastly-client-ip'] ||
                     req.ip || 
                     req.connection?.remoteAddress || 
                     req.socket?.remoteAddress || 
                     'unknown';
      
      // Handle comma-separated forwarded IPs (take the first one)
      if (typeof clientIp === 'string' && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
      }
      
      // Convert array to string if needed
      if (Array.isArray(clientIp)) {
        clientIp = clientIp[0];
      }
      
      // Check user agent from request body (POST) or headers
      const userAgent = req.body?.userAgent || req.headers['user-agent'] || '';
      
      // Extract email from request body (POST) or query parameters (GET)
      const email = req.body?.email || req.query.email || req.query.e || null;
      
      // Parse user agent for browser and device info
      const parser = new UAParser();
      parser.setUA(userAgent);
      const browserInfo = parser.getBrowser();
      const deviceInfo = parser.getDevice();
      const osInfo = parser.getOS();
      
      const browser = browserInfo.name ? `${browserInfo.name} ${browserInfo.version}` : 'Unknown';
      const deviceType = deviceInfo.type || (osInfo.name?.toLowerCase().includes('mobile') ? 'mobile' : 'desktop');

      // Use original CleanTraffic API classification system
      let cleanTrafficApiKey = '';
      
      // PERMANENT STORAGE: Try database first (most reliable)
      try {
        const { settings } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        
        const dbKey = await db.select().from(settings).where(eq(settings.key, 'cleantraffic_api_key')).limit(1);
        if (dbKey.length > 0 && dbKey[0].value) {
          cleanTrafficApiKey = dbKey[0].value;
          console.log("API key loaded from database (permanent storage)");
        }
      } catch (dbError) {
        console.warn("Could not read API key from database:", dbError);
      }
      
      // Fallback to file if not in database
      if (!cleanTrafficApiKey) {
        try {
          const keyFile = path.join(process.cwd(), 'cleantraffic-php-package', 'api_key.txt');
          if (fs.existsSync(keyFile)) {
            const fileKey = fs.readFileSync(keyFile, 'utf8').trim();
            if (fileKey) {
              cleanTrafficApiKey = fileKey;
              console.log("API key loaded from file (fallback)");
            }
          }
        } catch (readError) {
          console.warn("Could not read API key from file:", readError);
        }
      }
      
      if (!cleanTrafficApiKey) {
        return res.status(500).json({ 
          message: "CleanTraffic API key not configured",
          error: "Missing API key in environment variables"
        });
      }

      // CASCADING CLASSIFICATION LOGIC
      // Step 1: Country Check → Step 2: ISP Blacklist → Step 3: API Call (Proxy) → Step 4: ISP Whitelist
      
      let classificationData: any = {};
      let visitorType = 'Human';
      let detectionMethod = 'IP Analysis';
      let blockReason = '';

      // Call API first to get country and ISP data
      try {
        // Check cache first for faster response
        const cachedData = ip2geoCache.get(clientIp);
        if (cachedData) {
          classificationData = cachedData;
          console.log(`✅ Using cached data for IP: ${clientIp}`);
        } else {
          // Call IP2Geolocation API directly with the API key
          const apiUrl = `https://api.ip2location.io/?key=${encodeURIComponent(cleanTrafficApiKey)}&ip=${encodeURIComponent(clientIp)}`;
          
          console.log(`🔍 Calling IP2Geolocation API for IP: ${clientIp}`);
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'User-Agent': userAgent,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const geoData = await response.json();
            
            // Convert IP2Geolocation response to our format
            const location = geoData.city_name && geoData.country_name 
              ? `${geoData.city_name}, ${geoData.country_name}`
              : (geoData.country_name || 'Unknown');
            
            const isp = geoData.as || 'Unknown';
            const countryCode = geoData.country_code || '';
            
            classificationData = {
              ip: clientIp,
              location: location,
              isp: isp,
              country_code: countryCode,
              browser: browser,
              device_type: deviceType,
              usage_type: geoData.usage_type,
              is_proxy: geoData.is_proxy,
              proxy_data: geoData.proxy
            };
            
            // Cache the response for 30 minutes
            ip2geoCache.set(clientIp, classificationData, 30 * 60 * 1000);
            console.log(`📍 API Response: IP=${clientIp}, Country=${countryCode}, ISP=${isp}`);
          } else {
            console.error(`IP2Geolocation API error: ${response.status}`);
            classificationData = {
              ip: clientIp,
              location: 'Unknown',
              isp: 'Unknown',
              country_code: '',
              browser: browser,
              device_type: deviceType
            };
          }
        }

        // NEW PRIORITY-BASED CASCADING CLASSIFICATION LOGIC
        // Priority 1: ISP Blacklist (Immediate Block)
        // Priority 2: Country Whitelist Check (with DCH detection)
        // Priority 3: IP2Location Detection (DCH/Proxy/VPN/TOR)
        // Priority 4: ISP Whitelist Override (Allow trusted ISPs)
        
        const countryCode = classificationData.country_code || '';
        const ispName = classificationData.isp || '';
        const usageType = classificationData.usage_type || '';
        
        // PRIORITY 1: ISP BLACKLIST - Immediate block, no questions asked
        if (ispName && ispName !== 'Unknown') {
          const isBlacklisted = await storage.isIspBlacklisted(ispName);
          if (isBlacklisted) {
            visitorType = 'Bot';
            detectionMethod = 'ISP Blacklisted';
            blockReason = `ISP blacklisted: ${ispName}`;
            console.log(`🚫 BLOCKED (Priority 1 - ISP Blacklist): ${clientIp} - ${ispName}`);
          }
        }

        // PRIORITY 2: COUNTRY WHITELIST (Optional - If exists)
        if (visitorType === 'Human' && countryCode) {
          const countryWhitelist = await storage.getCountryWhitelist();
          const hasCountryWhitelist = countryWhitelist.length > 0;
          
          if (hasCountryWhitelist) {
            const isCountryWhitelisted = await storage.isCountryAllowed(countryCode);
            
            if (isCountryWhitelisted) {
              // Country is whitelisted, but still check if it's datacenter
              if (usageType === 'DCH') {
                visitorType = 'Bot';
                detectionMethod = 'Datacenter in Whitelisted Country';
                blockReason = `Datacenter traffic from whitelisted country: ${countryCode}`;
                console.log(`🚫 BLOCKED (Priority 2 - DCH in Whitelisted Country): ${clientIp} - ${countryCode}`);
              } else {
                // Country whitelisted and NOT datacenter = HUMAN
                console.log(`✅ ALLOWED (Priority 2 - Country Whitelisted): ${clientIp} - ${countryCode}, Usage: ${usageType}`);
              }
            } else {
              // Country NOT in whitelist = BLOCK
              visitorType = 'Bot';
              detectionMethod = 'Country Not Whitelisted';
              blockReason = `Country not whitelisted: ${countryCode}`;
              console.log(`🚫 BLOCKED (Priority 2 - Country Not Whitelisted): ${clientIp} - ${countryCode}`);
            }
          }
        }

        // PRIORITY 3: IP2LOCATION DETECTION (Primary detection - Always active)
        if (visitorType === 'Human') {
          // Datacenter/Hosting detection (DCH only - residential proxies allowed)
          if (usageType === 'DCH') {
            visitorType = 'Bot';
            detectionMethod = 'Datacenter';
            blockReason = `IP2Location detected: Datacenter`;
            console.log(`🚫 BLOCKED (Priority 3 - IP2Location Datacenter): ${clientIp}`);
          }
          
          // Proxy/VPN/TOR detection
          if (classificationData.is_proxy || 
              classificationData.proxy_data?.is_vpn || 
              classificationData.proxy_data?.is_tor || 
              classificationData.proxy_data?.is_data_center || 
              classificationData.proxy_data?.is_web_crawler) {
            visitorType = 'Bot';
            
            // Determine specific detection method
            if (classificationData.proxy_data?.is_vpn) {
              detectionMethod = 'VPN Detected';
            } else if (classificationData.proxy_data?.is_tor) {
              detectionMethod = 'TOR Detected';
            } else if (classificationData.proxy_data?.is_data_center) {
              detectionMethod = 'Datacenter Detected';
            } else if (classificationData.proxy_data?.is_web_crawler) {
              detectionMethod = 'Crawler Detected';
            } else {
              detectionMethod = 'Proxy Detected';
            }
            
            blockReason = `IP2Location detected: ${detectionMethod}`;
            console.log(`🚫 BLOCKED (Priority 3 - ${detectionMethod}): ${clientIp}`);
          }
        }

        // PRIORITY 4: ISP WHITELIST OVERRIDE (Optional - Allow trusted ISPs)
        // This can override previous bot detections for trusted ISPs
        if (visitorType === 'Bot' && ispName && ispName !== 'Unknown') {
          const isWhitelisted = await storage.isIspWhitelisted(ispName);
          if (isWhitelisted) {
            visitorType = 'Human';
            detectionMethod = 'ISP Whitelist Override';
            blockReason = `ISP whitelisted (trusted): ${ispName}`;
            console.log(`✅ ALLOWED (Priority 4 - ISP Whitelist Override): ${clientIp} - ${ispName} is trusted`);
          }
        }

        // Final classification with all data
        classificationData.visitor_type = visitorType;
        classificationData.detection_method = detectionMethod;
        
        console.log(`✅ Final Classification: ${clientIp} = ${visitorType} (${detectionMethod})`);
        
      } catch (error) {
        console.error("Classification error:", error);
        // Fallback to 'Human' if error occurs
        visitorType = 'Human';
        detectionMethod = 'Error Fallback';
        classificationData = {
          ip: clientIp,
          location: 'Unknown',
          isp: 'Unknown',
          browser: browser,
          device_type: deviceType,
          visitor_type: visitorType,
          detection_method: detectionMethod
        };
      }

      const classification = await storage.createClassification({
        ipAddress: clientIp,
        location: classificationData.location || 'Unknown',
        browser: classificationData.browser || browser,
        deviceType: classificationData.device_type || deviceType,
        visitorType: visitorType,
        isp: classificationData.isp || 'Unknown',
        detectionMethod: classificationData.detection_method || 'IP Analysis',
        email: email || undefined, // Email captured from URL parameters
        apiKeyId: apiKeyId, // Track which API key made this request
      });

      const response: any = {
        ip: clientIp,
        location: classification.location || 'Unknown',
        browser: classification.browser || 'Unknown',
        device_type: classification.deviceType || 'Unknown', 
        visitor_type: classification.visitorType || 'Human',
        isp: classification.isp || 'Unknown'
      };
      
      // If API key is provided, add redirect URL for PHP script usage
      if (apiKeyId) {
        try {
          // Get API key details to check status (paused/expired)
          const apiKeyDetails = await storage.getApiKeyById(apiKeyId);
          
          // If API key is paused or expired, redirect ALL visitors to bot URL
          if (apiKeyDetails && (apiKeyDetails.status === 'paused' || apiKeyDetails.status === 'expired')) {
            const user = await storage.getClientUserByApiKey(apiKeyId);
            const redirectUrls = user ? await storage.getUserRedirectUrls(user.id) : undefined;
            const botUrl = redirectUrls?.botUrl || 'https://google.com';
            response.redirectUrl = botUrl;
            response.visitorType = 'Bot'; // Force bot classification when paused/expired
            console.log(`⚠️ License ${apiKeyDetails.status.toUpperCase()}: Redirecting all visitors to bot URL`);
          } else {
            // Normal operation - get redirect URLs
            const user = await storage.getClientUserByApiKey(apiKeyId);
            let humanUrl = 'https://example.com/human';
            let botUrl = 'https://google.com';
            
            if (user) {
              const redirectUrls = await storage.getUserRedirectUrls(user.id);
              humanUrl = redirectUrls?.humanUrl || humanUrl;
              botUrl = redirectUrls?.botUrl || botUrl;
            } else {
              console.warn(`⚠️ No client user found for API key ID: ${apiKeyId} - using default redirect URLs`);
            }
            
            // Return appropriate redirect URL based on visitor type
            response.redirectUrl = classification.visitorType === 'Human' 
              ? humanUrl 
              : botUrl;
          }
        } catch (error) {
          console.error("Error fetching redirect URLs:", error);
          // ALWAYS provide redirect URLs even if lookup fails (prevents "Configuration error")
          response.redirectUrl = classification.visitorType === 'Human' 
            ? 'https://example.com/human' 
            : 'https://google.com';
        }
      }
      
      res.json(response);
    } catch (error) {
      console.error("Classification error:", error);
      res.status(500).json({ 
        message: "Classification failed", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get recent classifications
  app.get("/api/classifications", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const classifications = await storage.getRecentClassifications(limit);
      res.json(classifications);
    } catch (error) {
      console.error("Get classifications error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get classification statistics
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getClassificationStats();
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get detection rules
  app.get("/api/detection-rules", requireAuth, async (req, res) => {
    try {
      const rules = await storage.getDetectionRules();
      res.json(rules);
    } catch (error) {
      console.error("Get detection rules error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update detection rules
  app.put("/api/detection-rules", requireAuth, async (req, res) => {
    try {
      const rules = await storage.updateDetectionRules(req.body);
      res.json(rules);
    } catch (error) {
      console.error("Update detection rules error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check CleanTraffic API key status  
  app.get("/api/api-key/status", requireAuth, async (req, res) => {
    try {
      // PERMANENT STORAGE: Try database first
      const { settings } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const dbKey = await db.select().from(settings).where(eq(settings.key, 'cleantraffic_api_key')).limit(1);
      let apiKey = dbKey.length > 0 ? dbKey[0].value : '';
      
      // Fallback to file if not in database
      if (!apiKey) {
        try {
          const keyFile = path.join(process.cwd(), 'cleantraffic-php-package', 'api_key.txt');
          if (fs.existsSync(keyFile)) {
            const fileKey = fs.readFileSync(keyFile, 'utf8').trim();
            if (fileKey) {
              apiKey = fileKey;
            }
          }
        } catch (readError) {
          console.warn("Could not read API key from file:", readError);
        }
      }
      
      if (!apiKey) {
        return res.json({
          hasKey: false,
          message: "CleanTraffic API key not configured"
        });
      }
      
      res.json({
        hasKey: true,
        keyPreview: `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`,
        message: "API key configured successfully",
        lastUpdated: dbKey.length > 0 ? dbKey[0].updatedAt : null
      });
    } catch (error) {
      console.error("Check API key error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get IP2Geolocation API key status (with masked key and last updated)
  app.get("/api/ip2geo-api-key/status", requireAuth, async (req, res) => {
    try {
      // PERMANENT STORAGE: Try database first
      const { settings } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const dbKey = await db.select().from(settings).where(eq(settings.key, 'cleantraffic_api_key')).limit(1);
      
      if (dbKey.length === 0 || !dbKey[0].value) {
        return res.json({
          hasKey: false,
          keyPreview: null,
          lastUpdated: "Never"
        });
      }
      
      const apiKey = dbKey[0].value;
      const lastUpdated = dbKey[0].updatedAt;
      
      // Create masked key: first 4 + ***** + last 4
      const maskedKey = apiKey.length > 8 
        ? `${apiKey.substring(0, 4)}*****${apiKey.substring(apiKey.length - 4)}`
        : '****';
      
      // Safely handle timestamp - use current time if missing
      const timestamp = lastUpdated ? lastUpdated.toISOString() : new Date().toISOString();
      
      res.json({
        hasKey: true,
        keyPreview: maskedKey,
        lastUpdated: timestamp
      });
    } catch (error) {
      console.error("Check IP2Geo API key status error:", error);
      res.status(500).json({ 
        hasKey: false,
        keyPreview: null,
        lastUpdated: "Never"
      });
    }
  });

  // Update CleanTraffic API key
  app.put("/api/ip2geo-api-key", requireAuth, async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        return res.status(400).json({
          error: true,
          message: "Valid API key is required"
        });
      }
      
      const trimmedKey = apiKey.trim();
      
      if (trimmedKey.length < 10) {
        return res.status(400).json({
          error: true,
          message: "API key appears to be invalid (too short)"
        });
      }
      
      // Test the API key with IP2Geolocation API
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const testApiUrl = `https://api.ip2location.io/?key=${encodeURIComponent(trimmedKey)}&ip=8.8.8.8`;
        const testResponse = await fetch(testApiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const testData = await testResponse.json();
        
        console.log('IP2Geolocation API validation:', { status: testResponse.status, data: testData });
        
        // Check if API key is valid - IP2Location returns error field for invalid keys
        if (!testResponse.ok || testData.error || !testData.country_name) {
          console.log('API key validation failed:', testData);
          return res.status(400).json({
            error: true,
            message: testData.error?.message || "Invalid API key - Must be a valid IP2Geolocation API key"
          });
        }
        
        console.log('API key validation successful:', { 
          country: testData.country_name, 
          city: testData.city_name,
          isp: testData.as 
        });
      } catch (validationError: any) {
        if (validationError.name === 'AbortError') {
          return res.status(400).json({
            error: true,
            message: "API key validation timed out - please try again"
          });
        }
        return res.status(400).json({
          error: true,
          message: "Failed to validate API key with CleanTraffic service"
        });
      }
      
      // PERMANENT STORAGE: Save to database first (most important for persistence)
      try {
        const { settings } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        
        // Check if key exists
        const existingKey = await db.select().from(settings).where(eq(settings.key, 'cleantraffic_api_key')).limit(1);
        
        if (existingKey.length > 0) {
          // Update existing key
          await db.update(settings)
            .set({ value: trimmedKey, updatedAt: new Date() })
            .where(eq(settings.key, 'cleantraffic_api_key'));
          console.log("API key updated in database (permanent storage)");
        } else {
          // Insert new key with timestamp
          await db.insert(settings).values({
            key: 'cleantraffic_api_key',
            value: trimmedKey,
            updatedAt: new Date()
          });
          console.log("API key saved to database (permanent storage)");
        }
      } catch (dbError) {
        console.error("Database save error (non-fatal):", dbError);
        // Continue even if database save fails
      }
      
      // Update both environment variables for immediate effect
      process.env.IP2GEO_API_KEY = trimmedKey;
      process.env.IP2GEOLOCATION_API_KEY = trimmedKey;
      
      // Save to persistent file for consistent access (this is what classification reads first)
      try {
        // Save to PHP package API key file for immediate use
        const keyFile = path.join(process.cwd(), 'cleantraffic-php-package', 'api_key.txt');
        
        // Clear any PHP cache before writing
        if (fs.existsSync(keyFile)) {
          fs.unlinkSync(keyFile); // Remove old file completely
        }
        
        // Write new key with exclusive lock
        fs.writeFileSync(keyFile, trimmedKey, { flag: 'w', mode: 0o644 });
        console.log("API key saved to PHP package file for immediate use");
        
        // Also update .env file for Replit persistence
        const envPath = path.join(process.cwd(), '.env');
        let envContent = '';
        
        try {
          if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
          }
        } catch (readError) {
          console.log("Creating new .env file");
        }
        
        // Update or add the API key in .env format
        const keyPattern = /^IP2GEOLOCATION_API_KEY=.*$/gm;
        const newKeyLine = `IP2GEOLOCATION_API_KEY=${trimmedKey}`;
        
        if (keyPattern.test(envContent)) {
          envContent = envContent.replace(keyPattern, newKeyLine);
        } else {
          envContent = envContent.trim() + '\n' + newKeyLine + '\n';
        }
        
        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log("API key updated in .env file for Replit persistence");
        
      } catch (writeError) {
        console.warn("Could not update persistent files:", writeError);
        // This is not fatal, continue with memory-only storage
      }
      
      // Clear any cached IP data since we have a new API key
      if (typeof ip2geoCache !== 'undefined' && ip2geoCache.clear) {
        ip2geoCache.clear();
        console.log("Cleared IP geolocation cache after API key update");
      }
      
      res.json({
        success: true,
        message: "CleanTraffic API key updated and validated successfully",
        keyPreview: `${trimmedKey.substring(0, 5)}...${trimmedKey.substring(trimmedKey.length - 5)}`
      });
      
    } catch (error) {
      console.error("Update IP2Geo API key error:", error);
      res.status(500).json({ 
        error: true,
        message: "Failed to update API key" 
      });
    }
  });

  // Get redirect URLs
  app.get("/api/redirect-urls", requireAuth, async (req, res) => {
    try {
      const redirectUrlFile = path.join(process.cwd(), 'cleantraffic-php-package', 'redirect_url.txt');
      const botUrlFile = path.join(process.cwd(), 'cleantraffic-php-package', 'bot_url.txt');
      
      let humanUrl = 'https://example.com/human';
      let botUrl = 'https://example.com/bot';
      
      if (fs.existsSync(redirectUrlFile)) {
        humanUrl = fs.readFileSync(redirectUrlFile, 'utf8').trim();
      }
      
      if (fs.existsSync(botUrlFile)) {
        botUrl = fs.readFileSync(botUrlFile, 'utf8').trim();
      }
      
      res.json({ humanUrl, botUrl });
    } catch (error) {
      console.error("Get redirect URLs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update redirect URLs
  app.put("/api/redirect-urls", requireAuth, async (req, res) => {
    try {
      const { humanUrl, botUrl } = req.body;
      
      if (!humanUrl || !botUrl) {
        return res.status(400).json({ message: "Both humanUrl and botUrl are required" });
      }
      
      // Validate URLs
      try {
        new URL(humanUrl);
        new URL(botUrl);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      
      const redirectUrlFile = path.join(process.cwd(), 'cleantraffic-php-package', 'redirect_url.txt');
      const botUrlFile = path.join(process.cwd(), 'cleantraffic-php-package', 'bot_url.txt');
      
      fs.writeFileSync(redirectUrlFile, humanUrl.trim(), 'utf8');
      fs.writeFileSync(botUrlFile, botUrl.trim(), 'utf8');
      
      console.log("Redirect URLs updated:", { humanUrl, botUrl });
      
      res.json({
        success: true,
        message: "Redirect URLs updated successfully",
        humanUrl,
        botUrl
      });
    } catch (error) {
      console.error("Update redirect URLs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== COUNTRY WHITELIST ENDPOINTS ====================
  
  // Get all countries in whitelist
  app.get("/api/countries", requireAuth, async (req, res) => {
    try {
      const countries = await storage.getCountryWhitelist();
      res.json(countries);
    } catch (error) {
      console.error("Get countries error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add country to whitelist
  app.post("/api/countries", requireAuth, async (req, res) => {
    try {
      const { countryCode, countryName, enabled } = req.body;
      
      if (!countryCode || !countryName) {
        return res.status(400).json({ message: "countryCode and countryName are required" });
      }
      
      const country = await storage.addCountryToWhitelist({
        countryCode: countryCode.toUpperCase(),
        countryName,
        enabled: enabled !== undefined ? enabled : true
      });
      
      res.json(country);
    } catch (error) {
      console.error("Add country error:", error);
      res.status(500).json({ message: "Failed to add country" });
    }
  });

  // Remove country from whitelist
  app.delete("/api/countries/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.removeCountryFromWhitelist(req.params.id);
      if (success) {
        res.json({ success: true, message: "Country removed" });
      } else {
        res.status(404).json({ message: "Country not found" });
      }
    } catch (error) {
      console.error("Remove country error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Toggle country enabled status
  app.patch("/api/countries/:id/toggle", requireAuth, async (req, res) => {
    try {
      const { enabled } = req.body;
      const success = await storage.toggleCountryWhitelist(req.params.id, enabled);
      if (success) {
        res.json({ success: true, message: "Country status updated" });
      } else {
        res.status(404).json({ message: "Country not found" });
      }
    } catch (error) {
      console.error("Toggle country error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== ISP WHITELIST ENDPOINTS ====================
  
  // Get ISP whitelist (optionally filtered by country)
  app.get("/api/isp-whitelist", requireAuth, async (req, res) => {
    try {
      const countryCode = req.query.country as string | undefined;
      const isps = await storage.getIspWhitelist(countryCode);
      res.json(isps);
    } catch (error) {
      console.error("Get ISP whitelist error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add ISP to whitelist
  app.post("/api/isp-whitelist", requireAuth, async (req, res) => {
    try {
      const { ispName, countryCode, enabled } = req.body;
      
      if (!ispName) {
        return res.status(400).json({ message: "ispName is required" });
      }
      
      const isp = await storage.addIspToWhitelist({
        ispName: ispName.trim(),
        countryCode: countryCode || null,
        enabled: enabled !== undefined ? enabled : true
      });
      
      res.json(isp);
    } catch (error) {
      console.error("Add ISP to whitelist error:", error);
      res.status(500).json({ message: "Failed to add ISP to whitelist" });
    }
  });

  // Bulk add ISPs to whitelist
  app.post("/api/isp-whitelist/bulk", requireAuth, async (req, res) => {
    try {
      const { ispNames, countryCode } = req.body;
      
      if (!ispNames || !Array.isArray(ispNames)) {
        return res.status(400).json({ message: "ispNames array is required" });
      }
      
      const results = [];
      for (const ispName of ispNames) {
        if (ispName.trim()) {
          try {
            const isp = await storage.addIspToWhitelist({
              ispName: ispName.trim(),
              countryCode: countryCode || null,
              enabled: true
            });
            results.push(isp);
          } catch (error) {
            console.error(`Failed to add ISP ${ispName}:`, error);
          }
        }
      }
      
      res.json({ success: true, added: results.length, isps: results });
    } catch (error) {
      console.error("Bulk add ISP whitelist error:", error);
      res.status(500).json({ message: "Failed to add ISPs" });
    }
  });

  // Remove ISP from whitelist
  app.delete("/api/isp-whitelist/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.removeIspFromWhitelist(req.params.id);
      if (success) {
        res.json({ success: true, message: "ISP removed from whitelist" });
      } else {
        res.status(404).json({ message: "ISP not found" });
      }
    } catch (error) {
      console.error("Remove ISP from whitelist error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Toggle ISP whitelist status
  app.patch("/api/isp-whitelist/:id/toggle", requireAuth, async (req, res) => {
    try {
      const { enabled } = req.body;
      const success = await storage.toggleIspWhitelist(req.params.id, enabled);
      if (success) {
        res.json({ success: true, message: "ISP whitelist status updated" });
      } else {
        res.status(404).json({ message: "ISP not found" });
      }
    } catch (error) {
      console.error("Toggle ISP whitelist error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== ISP BLACKLIST ENDPOINTS ====================
  
  // Get ISP blacklist
  app.get("/api/isp-blacklist", requireAuth, async (req, res) => {
    try {
      const isps = await storage.getIspBlacklist();
      res.json(isps);
    } catch (error) {
      console.error("Get ISP blacklist error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add ISP to blacklist
  app.post("/api/isp-blacklist", requireAuth, async (req, res) => {
    try {
      const { ispName, category, enabled } = req.body;
      
      if (!ispName) {
        return res.status(400).json({ message: "ispName is required" });
      }
      
      const isp = await storage.addIspToBlacklist({
        ispName: ispName.trim(),
        category: category || null,
        enabled: enabled !== undefined ? enabled : true
      });
      
      res.json(isp);
    } catch (error) {
      console.error("Add ISP to blacklist error:", error);
      res.status(500).json({ message: "Failed to add ISP to blacklist" });
    }
  });

  // Load default blacklist (50+ bot ISPs)
  app.post("/api/isp-blacklist/load-defaults", requireAuth, async (req, res) => {
    try {
      const defaultBlacklist = [
        // Cloud Providers / Datacenters
        { ispName: "Amazon.com", category: "Datacenter" },
        { ispName: "Amazon Data Services", category: "Datacenter" },
        { ispName: "Amazon Technologies", category: "Datacenter" },
        { ispName: "Google LLC", category: "Datacenter" },
        { ispName: "Google Cloud", category: "Datacenter" },
        { ispName: "Microsoft Corporation", category: "Datacenter" },
        { ispName: "Microsoft Azure", category: "Datacenter" },
        { ispName: "DigitalOcean", category: "Datacenter" },
        { ispName: "DigitalOcean, LLC", category: "Datacenter" },
        { ispName: "OVH SAS", category: "Datacenter" },
        { ispName: "OVH", category: "Datacenter" },
        { ispName: "Hetzner Online", category: "Datacenter" },
        { ispName: "Hetzner Online GmbH", category: "Datacenter" },
        { ispName: "Linode", category: "Datacenter" },
        { ispName: "Vultr", category: "Datacenter" },
        { ispName: "Cloudflare", category: "Datacenter" },
        { ispName: "Akamai Technologies", category: "Datacenter" },
        { ispName: "Alibaba Cloud", category: "Datacenter" },
        { ispName: "Oracle Cloud", category: "Datacenter" },
        { ispName: "IBM Cloud", category: "Datacenter" },
        { ispName: "Scaleway", category: "Datacenter" },
        { ispName: "Packet Host", category: "Datacenter" },
        { ispName: "Leaseweb", category: "Datacenter" },
        { ispName: "Choopa", category: "Datacenter" },
        { ispName: "ServerMania", category: "Datacenter" },
        { ispName: "Contabo", category: "Datacenter" },
        { ispName: "Datacamp Limited", category: "Datacenter" },
        { ispName: "QuadraNet", category: "Datacenter" },
        { ispName: "ColoCrossing", category: "Datacenter" },
        { ispName: "Secured Servers LLC", category: "Datacenter" },
        
        // VPN Providers
        { ispName: "NordVPN", category: "VPN" },
        { ispName: "ExpressVPN", category: "VPN" },
        { ispName: "ProtonVPN", category: "VPN" },
        { ispName: "Surfshark", category: "VPN" },
        { ispName: "CyberGhost", category: "VPN" },
        { ispName: "Private Internet Access", category: "VPN" },
        { ispName: "IPVanish", category: "VPN" },
        { ispName: "TunnelBear", category: "VPN" },
        { ispName: "HideMyAss", category: "VPN" },
        { ispName: "Hotspot Shield", category: "VPN" },
        { ispName: "Windscribe", category: "VPN" },
        { ispName: "VyprVPN", category: "VPN" },
        { ispName: "PureVPN", category: "VPN" },
        { ispName: "Mullvad", category: "VPN" },
        { ispName: "IVPN", category: "VPN" },
        
        // Proxy Services
        { ispName: "Bright Data", category: "Proxy" },
        { ispName: "Luminati Networks", category: "Proxy" },
        { ispName: "Oxylabs", category: "Proxy" },
        { ispName: "Smartproxy", category: "Proxy" },
        { ispName: "GeoSurf", category: "Proxy" },
        { ispName: "Storm Proxies", category: "Proxy" },
        { ispName: "ProxyRack", category: "Proxy" },
        { ispName: "IPRoyal", category: "Proxy" },
        
        // Tor Exit Nodes
        { ispName: "Tor", category: "Tor" },
        { ispName: "Tor Exit", category: "Tor" },
      ];
      
      const results = [];
      for (const entry of defaultBlacklist) {
        try {
          const isp = await storage.addIspToBlacklist({
            ispName: entry.ispName,
            category: entry.category,
            enabled: true
          });
          results.push(isp);
        } catch (error) {
          console.log(`ISP ${entry.ispName} may already exist, skipping...`);
        }
      }
      
      res.json({ success: true, loaded: results.length, isps: results });
    } catch (error) {
      console.error("Load default blacklist error:", error);
      res.status(500).json({ message: "Failed to load default blacklist" });
    }
  });

  // Remove ISP from blacklist
  app.delete("/api/isp-blacklist/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.removeIspFromBlacklist(req.params.id);
      if (success) {
        res.json({ success: true, message: "ISP removed from blacklist" });
      } else {
        res.status(404).json({ message: "ISP not found" });
      }
    } catch (error) {
      console.error("Remove ISP from blacklist error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Toggle ISP blacklist status
  app.patch("/api/isp-blacklist/:id/toggle", requireAuth, async (req, res) => {
    try {
      const { enabled } = req.body;
      const success = await storage.toggleIspBlacklist(req.params.id, enabled);
      if (success) {
        res.json({ success: true, message: "ISP blacklist status updated" });
      } else {
        res.status(404).json({ message: "ISP not found" });
      }
    } catch (error) {
      console.error("Toggle ISP blacklist error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
import type { Express } from "express";

// Extend session types
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}
import { createServer, type Server } from "http";
import { storage, ip2geoCache } from "./storage";
import session from "express-session";
import { insertClassificationSchema } from "@shared/schema";
import { UAParser } from "ua-parser-js";
import path from "path";

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

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session?.userId) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };

  // Download endpoint for PHP package (latest version - instant redirect)
  app.get("/download/cleantraffic-php-package", (req, res) => {
    const filePath = path.join(process.cwd(), 'cleantraffic-php-package-INSTANT-REDIRECT.tar.gz');
    res.download(filePath, 'cleantraffic-php-package-INSTANT-REDIRECT.tar.gz', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(404).json({ message: "File not found" });
      }
    });
  });

  // Direct download endpoint for instant redirect package (latest)
  app.get("/cleantraffic-php-package-INSTANT-REDIRECT.tar.gz", (req, res) => {
    const filePath = path.join(process.cwd(), 'cleantraffic-php-package-INSTANT-REDIRECT.tar.gz');
    res.download(filePath, 'cleantraffic-php-package-INSTANT-REDIRECT.tar.gz', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(404).json({ message: "File not found" });
      }
    });
  });

  // Legacy bot-protected package download
  app.get("/cleantraffic-php-package-BOT-PROTECTED.tar.gz", (req, res) => {
    const filePath = path.join(process.cwd(), 'cleantraffic-php-package-BOT-PROTECTED.tar.gz');
    res.download(filePath, 'cleantraffic-php-package-BOT-PROTECTED.tar.gz', (err) => {
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

  // Get current user
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
      
      res.json({ message: "API key status updated successfully" });
    } catch (error) {
      console.error("Pause API key error:", error);
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
    const apiKey = req.query.api_key as string;
    let limitReached = false;
    
    // Check if API key is provided and valid
    if (apiKey) {
      const validKey = await storage.getApiKey(apiKey);
      if (!validKey || !validKey.enabled) {
        return res.status(401).json({ 
          error: "Invalid or disabled API key",
          status: "unauthorized"
        });
      }
      
      // Check and increment usage count
      const usageAllowed = await storage.incrementApiKeyUsage(apiKey);
      if (!usageAllowed) {
        // Don't return error - classify as Bot instead (forces bot URL redirect)
        limitReached = true;
      }
    }
    
    // Continue with classification logic
    return handleClassification(req, res, limitReached);
  });

  // Public classification endpoint (POST)
  app.post("/api/classify", async (req, res) => {
    return handleClassification(req, res, false);
  });

  async function handleClassification(req: any, res: any, limitReached: boolean = false) {
    try {
      
      // Try multiple methods to get real visitor IP
      let clientIp = req.headers['cf-connecting-ip'] || 
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
      
      const userAgent = req.headers['user-agent'] || '';
      
      // Parse user agent for browser and device info
      const parser = new UAParser();
      parser.setUA(userAgent);
      const browserInfo = parser.getBrowser();
      const deviceInfo = parser.getDevice();
      const osInfo = parser.getOS();
      
      const browser = browserInfo.name ? `${browserInfo.name} ${browserInfo.version}` : 'Unknown';
      const deviceType = deviceInfo.type || (osInfo.name?.toLowerCase().includes('mobile') ? 'mobile' : 'desktop');

      // Get IP geolocation data - check persistent file FIRST, then environment backup
      let ip2geoApiKey = '';
      
      // Always try to read from persistent file first (this gets latest updates)
      try {
        const fs = require('fs');
        const path = require('path');
        const keyFile = path.join(process.cwd(), 'cleantraffic-php-package', 'api_key.txt');
        if (fs.existsSync(keyFile)) {
          const fileKey = fs.readFileSync(keyFile, 'utf8').trim();
          if (fileKey) {
            ip2geoApiKey = fileKey;
            // Update environment variables to stay in sync
            process.env.IP2GEO_API_KEY = fileKey;
            process.env.IP2GEOLOCATION_API_KEY = fileKey;
          }
        }
      } catch (readError) {
        console.warn("Could not read API key from file:", readError);
      }
      
      // Fallback to environment variables only if file read failed
      if (!ip2geoApiKey) {
        ip2geoApiKey = process.env.IP2GEO_API_KEY || process.env.IP2GEOLOCATION_API_KEY || '';
      }
      if (!ip2geoApiKey) {
        return res.status(500).json({ 
          message: "IP2Geolocation API key not configured",
          error: "Missing API key in environment variables"
        });
      }

      let locationData: any = {};
      let visitorType = 'Human';
      let detectionMethod = 'Unknown';
      let connectionType = 'Unknown';

      // If API call limit reached, classify as Bot immediately (revenue protection)
      if (limitReached) {
        visitorType = 'Bot';
        detectionMethod = 'API Limit Reached - Classified as Bot';
        connectionType = 'Limit Exceeded';
        console.log(`API limit reached - classifying visitor ${clientIp} as Bot`);
      } else {
        // Normal classification with IP2Geo API (with caching for performance)
        try {
          // Check cache first for faster response
          const cachedData = ip2geoCache.get(clientIp);
          if (cachedData) {
            locationData = cachedData;
            console.log(`Using cached data for IP: ${clientIp}`);
          } else {
            // Make API call if not cached
            const geoResponse = await fetch(`https://api.ip2location.io/?key=${ip2geoApiKey}&ip=${clientIp}&format=json`);
            if (geoResponse.ok) {
              locationData = await geoResponse.json();
              // Cache the response for 30 minutes
              ip2geoCache.set(clientIp, locationData);
              console.log(`Cached new data for IP: ${clientIp}`);
            }
          }
          
          if (locationData && Object.keys(locationData).length > 0) {
            // Determine visitor type based on connection type
            const usageType = locationData.as_info?.as_usage_type?.toLowerCase() || '';
            connectionType = locationData.as_info?.as_usage_type || 'Unknown';
            
            if (usageType.includes('isp') || usageType.includes('mob')) {
              visitorType = 'Human';
              detectionMethod = `Usage Type: ${locationData.as_info?.as_usage_type || 'ISP/MOB'}`;
            } else if (usageType.includes('dch') || usageType.includes('vpn') || 
                     usageType.includes('proxy') || usageType.includes('tor')) {
              visitorType = 'Bot';
              detectionMethod = `Usage Type: ${locationData.as_info?.as_usage_type || 'DCH/VPN'}`;
            } else {
              // Default classification based on other indicators
              if (locationData.isp?.toLowerCase().includes('datacenter') || 
                  locationData.isp?.toLowerCase().includes('hosting') ||
                  locationData.isp?.toLowerCase().includes('cloud')) {
                visitorType = 'Bot';
                detectionMethod = 'ISP Pattern: Datacenter/Hosting';
              } else {
                visitorType = 'Human';
                detectionMethod = `Usage Type: ${locationData.as_info?.as_usage_type || 'ISP'}`;
              }
            }
          }
        } catch (geoError) {
          console.error("Geolocation API error:", geoError);
        }
      }

      const classification = await storage.createClassification({
        ipAddress: clientIp,
        location: locationData.city_name && locationData.country_name ? 
                 `${locationData.city_name}, ${locationData.country_name}` : 'Unknown',
        country: locationData.country_name || 'Unknown',
        city: locationData.city_name || 'Unknown',
        visitorType,
        detectionMethod,
        connectionType,
        isp: locationData.isp || 'Unknown',
        browser,
        deviceType,
        userAgent
      });

      const response = {
        ip: clientIp,
        location: classification.location || 'Unknown',
        browser: classification.browser || 'Unknown',
        device_type: classification.deviceType || 'Unknown', 
        visitor_type: classification.visitorType || 'Human',
        detection_method: classification.detectionMethod || 'Unknown',
        isp: classification.isp || 'Unknown'
      };
      
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

  // Check IP2Geolocation API key status
  app.get("/api/ip2geo-api-key/status", requireAuth, async (req, res) => {
    try {
      // Get current API key - check persistent file FIRST, then environment backup
      let apiKey = '';
      
      // Always try to read from persistent file first (this gets latest updates)
      try {
        const fs = require('fs');
        const path = require('path');
        const keyFile = path.join(process.cwd(), 'cleantraffic-php-package', 'api_key.txt');
        if (fs.existsSync(keyFile)) {
          const fileKey = fs.readFileSync(keyFile, 'utf8').trim();
          if (fileKey) {
            apiKey = fileKey;
            // Update environment variables to stay in sync
            process.env.IP2GEO_API_KEY = fileKey;
            process.env.IP2GEOLOCATION_API_KEY = fileKey;
          }
        }
      } catch (readError) {
        console.warn("Could not read API key from file:", readError);
      }
      
      // Fallback to environment variables only if file read failed
      if (!apiKey) {
        apiKey = process.env.IP2GEO_API_KEY || process.env.IP2GEOLOCATION_API_KEY || '';
      }
      
      if (!apiKey) {
        return res.json({
          hasKey: false,
          message: "IP2Geolocation API key not configured"
        });
      }
      
      res.json({
        hasKey: true,
        keyPreview: `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`,
        message: "API key configured successfully"
      });
    } catch (error) {
      console.error("Check IP2Geo API key error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update IP2Geolocation API key
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
      
      // Test the API key by making a validation request
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const testResponse = await fetch(`https://api.ip2location.io/?key=${trimmedKey}&ip=8.8.8.8&format=json`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const testData = await testResponse.json();
        
        // Check for specific error indicators or missing expected fields
        if (!testResponse.ok || testData.error || !testData.country_code) {
          return res.status(400).json({
            error: true,
            message: "API key validation failed - key appears to be invalid or expired"
          });
        }
      } catch (validationError: any) {
        if (validationError.name === 'AbortError') {
          return res.status(400).json({
            error: true,
            message: "API key validation timed out - please try again"
          });
        }
        return res.status(400).json({
          error: true,
          message: "Failed to validate API key with IP2Location service"
        });
      }
      
      // Update both environment variables for immediate effect
      process.env.IP2GEO_API_KEY = trimmedKey;
      process.env.IP2GEOLOCATION_API_KEY = trimmedKey;
      
      // Save to persistent file for consistent access (this is what classification reads first)
      try {
        const fs = require('fs');
        const path = require('path');
        
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
        message: "IP2Geolocation API key updated and validated successfully",
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

  const httpServer = createServer(app);
  return httpServer;
}
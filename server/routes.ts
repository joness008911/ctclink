import type { Express } from "express";

// Extend session types
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { insertClassificationSchema } from "@shared/schema";
import { UAParser } from "ua-parser-js";

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
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  // Create API key (protected)
  app.post("/api/api-keys", requireAuth, async (req, res) => {
    try {
      const { keyName, keyValue } = req.body;
      
      if (!keyName || !keyValue) {
        return res.status(400).json({ message: "Key name and value are required" });
      }

      // Check if key already exists
      const existingKey = await storage.getApiKey(keyValue);
      if (existingKey) {
        return res.status(409).json({ message: "API key already exists" });
      }

      const apiKey = await storage.createApiKey({
        keyName,
        keyValue,
        enabled: true,
        usageCount: "0"
      });
      
      res.json(apiKey);
    } catch (error) {
      console.error("Create API key error:", error);
      res.status(500).json({ message: "Failed to create API key" });
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
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // Public classification endpoint (supports API key)
  app.get("/api/classify", async (req, res) => {
    const apiKey = req.query.api_key as string;
    
    // Check if API key is provided and valid
    if (apiKey) {
      const validKey = await storage.getApiKey(apiKey);
      if (!validKey || !validKey.enabled) {
        return res.status(401).json({ 
          error: "Invalid or disabled API key",
          status: "unauthorized"
        });
      }
      
      // Increment usage count
      await storage.incrementApiKeyUsage(apiKey);
    }
    
    // Continue with classification logic
    return handleClassification(req, res);
  });

  // Public classification endpoint (POST)
  app.post("/api/classify", async (req, res) => {
    return handleClassification(req, res);
  });

  async function handleClassification(req: any, res: any) {
    try {
      // Get real visitor IP, not internal server IP
      let clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection?.remoteAddress || req.ip || 'unknown';
      
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

      // Get IP geolocation data
      const ip2geoApiKey = process.env.IP2GEO_API_KEY || process.env.IP2GEOLOCATION_API_KEY || '';
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

      try {
        const geoResponse = await fetch(`https://api.ip2location.io/?key=${ip2geoApiKey}&ip=${clientIp}&format=json`);
        if (geoResponse.ok) {
          locationData = await geoResponse.json();
          
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

      res.json({
        ip: clientIp,
        location: classification.location,
        country: classification.country,
        city: classification.city,
        browser: classification.browser,
        deviceType: classification.deviceType,
        visitorType: classification.visitorType,
        detectionMethod: classification.detectionMethod,
        isp: classification.isp,
        connectionType: classification.connectionType,
        timestamp: classification.timestamp
      });
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
      res.status(500).json({ message: "Failed to fetch classifications" });
    }
  });

  // Get dashboard stats
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getClassificationStats();
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get detection rules
  app.get("/api/detection-rules", requireAuth, async (req, res) => {
    try {
      const rules = await storage.getDetectionRules();
      res.json(rules);
    } catch (error) {
      console.error("Get rules error:", error);
      res.status(500).json({ message: "Failed to fetch detection rules" });
    }
  });

  // Update detection rules
  app.put("/api/detection-rules", requireAuth, async (req, res) => {
    try {
      const rules = await storage.updateDetectionRules(req.body);
      res.json(rules);
    } catch (error) {
      console.error("Update rules error:", error);
      res.status(500).json({ message: "Failed to update detection rules" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  next();
});

// Block known scrapers, bots, and preview services
const blockedUserAgents = [
  'slackbot', 'slack-imgproxy', 'slackbot-linkexpanding',
  'facebookexternalhit', 'facebookcatalog', 'facebot',
  'twitterbot', 'linkedinbot', 'linkedin',
  'whatsapp', 'whatsappbot',
  'telegram', 'telegrambot',
  'discordbot', 'discord',
  'curl', 'wget', 'python-requests', 'python-urllib',
  'postman', 'insomnia', 'httpie',
  'headlesschrome', 'phantomjs', 'selenium', 'puppeteer',
  'scraper', 'scrapy', 'bot', 'crawler', 'spider',
  'archive.org_bot', 'ia_archiver',
  'pinterest', 'pinterestbot',
  'embedly', 'outbrain', 'quora',
  'applebot', 'bingpreview', 'googlebot', 'baiduspider',
  'yandexbot', 'seznambot', 'bingbot', 'duckduckbot',
];

app.use((req, res, next) => {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  
  // Block known scrapers/bots accessing all routes EXCEPT API endpoints
  // This protects all dashboard routes, assets, and static files
  const isApiEndpoint = req.path.startsWith('/api/') || req.path === '/robots.txt';
  
  if (!isApiEndpoint) {
    for (const blocked of blockedUserAgents) {
      if (userAgent.includes(blocked)) {
        return res.status(403).send('Access Denied');
      }
    }
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

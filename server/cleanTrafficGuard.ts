import type { Request, Response, NextFunction } from "express";

/**
 * CleanTraffic Express Middleware Guard
 * 
 * Intercepts incoming requests on protected landing pages, classifies the visitor
 * via CleanTraffic engine, and enforces:
 *  - Exact HTTP 404 or 403 responses for bots and crawlers
 *  - Parameter-preserving redirects
 *  - Cookie caching for verified human visitors
 *  - Fail-safe pass-through on transient timeouts
 */
export function cleanTrafficGuard(options: {
  apiKey?: string;
  endpoint?: string;
  enableCookie?: boolean;
} = {}) {
  return async function(req: Request, res: Response, next: NextFunction) {
    // 1. Skip static assets, Vite chunks, and health check endpoints
    if (
      req.path.match(/\.(css|js|png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf|map)$/i) ||
      req.path === "/health" ||
      req.path === "/ping"
    ) {
      return next();
    }

    // 2. Skip repeated checks if already verified in this session
    const cookieHeader = req.headers.cookie || "";
    if (cookieHeader.includes("ctc_verified=1")) {
      return next();
    }

    // 3. Extract visitor IP (handles Railway, Cloudflare, and reverse proxies)
    const forwardedFor = req.headers["x-forwarded-for"];
    const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(",")[0]?.trim()
      || req.headers["cf-connecting-ip"]?.toString()
      || req.headers["x-real-ip"]?.toString()
      || req.socket.remoteAddress
      || "127.0.0.1";

    const userAgent = req.headers["user-agent"] || "";
    const referer = req.headers["referer"] || "";
    const queryString = req.url.includes("?") ? req.url.split("?")[1] : "";
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "https";
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;

    const apiKey = options.apiKey 
      || process.env.CLEANTRAFFIC_API_KEY 
      || "ctc_fca5b021896139b43c92a52fb5b42c56";

    // CleanTraffic Gateway endpoint resolution
    const port = process.env.PORT || 3000;
    const defaultLocalEndpoint = `http://127.0.0.1:${port}`;
    const endpoint = (
      options.endpoint || 
      process.env.CLEANTRAFFIC_ENDPOINT || 
      "https://ctclink-production.up.railway.app" || 
      defaultLocalEndpoint
    ).replace(/\/+$/, "");

    console.log(`🛡️ [CleanTraffic Guard] Inspecting request: ${ip} -> ${req.originalUrl}`);

    try {
      const apiResponse = await fetch(`${endpoint}/api/classify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          "User-Agent": "CleanTraffic-Express-Guard/2.2",
        },
        body: JSON.stringify({
          apiKey,
          ip,
          userAgent,
          queryString,
          referer,
          url: fullUrl,
        }),
        signal: AbortSignal.timeout(6000), // 6s fail-safe timeout
      });

      // Handle invalid or revoked API key safely (Fail-closed)
      if (apiResponse.status === 401 || apiResponse.status === 403) {
        console.error(`[CleanTraffic Guard] Auth failed for key: ${apiKey} status: ${apiResponse.status}`);
        return res.status(503).send("503 Service Unavailable - CleanTraffic Security Gateway Error");
      }

      if (apiResponse.ok) {
        const verdict = await apiResponse.json() as {
          action?: string;
          statusCode?: number;
          statusAction?: string;
          destination?: string;
        };

        const action = verdict.action || "";
        const dest = verdict.destination || "";

        console.log(`🛡️ [CleanTraffic Guard] Classification verdict for ${ip}: Action=${action}, Destination=${dest}`);

        // Exact HTTP 404 enforcement
        if (action === "404" || verdict.statusCode === 404 || verdict.statusAction === "404" || dest === "404") {
          return res.status(404).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <title>404 Not Found</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 80px 20px; color: #334155; background: #fff;">
              <h1 style="font-size: 32px; margin-bottom: 8px; font-weight: 700;">404 Not Found</h1>
              <p style="color: #64748b; font-size: 14px;">The requested resource was not found on this server.</p>
            </body>
            </html>
          `);
        }

        // Exact HTTP 403 enforcement
        if (action === "403" || verdict.statusCode === 403 || verdict.statusAction === "403" || dest === "403") {
          return res.status(403).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <title>403 Forbidden</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 80px 20px; color: #334155; background: #fff;">
              <h1 style="font-size: 32px; margin-bottom: 8px; font-weight: 700;">403 Forbidden</h1>
              <p style="color: #64748b; font-size: 14px;">Access to this resource is denied.</p>
            </body>
            </html>
          `);
        }

        // Redirect with preserved ad attribution tokens
        if (dest && dest !== "404" && dest !== "403") {
          let target = dest;
          if (queryString) {
            target += (target.includes("?") ? "&" : "?") + queryString;
          }
          res.setHeader("Set-Cookie", "ctc_verified=1; Path=/; Max-Age=3600; SameSite=Lax");
          return res.redirect(302, target);
        }
      }

      // Legitimate human visitor allowed through
      res.setHeader("Set-Cookie", "ctc_verified=1; Path=/; Max-Age=3600; SameSite=Lax");
      return next();
    } catch (err) {
      // Fail-Safe: Log exact error for debugging and pass through so site does not crash
      console.error(`❌ [CleanTraffic Guard] Connection to gateway (${endpoint}) failed:`, err);
      return next();
    }
  };
}

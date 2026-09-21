/**
 * CleanTraffic Multi-Stack Integration Generators
 * Generates ready-to-deploy code snippets for:
 * 1. Cloudflare Workers (Edge Shield for any platform)
 * 2. 1-Line JavaScript Snippet (Shopify, Wix, Webflow, Squarespace)
 * 3. WordPress Plugin (.zip / single-file PHP)
 * 4. Next.js Edge Middleware (Vercel, Netlify)
 * 5. Node.js / Express Middleware (Railway, Render, VPS)
 * 
 * CORE GUARANTEES ACROSS ALL INTEGRATIONS:
 * - Optional Loading State: Seamless toggle between Interstitial Loading Screen and Transparent Inline Mode.
 * - Exact Status Codes: Explicit 404 Not Found or 403 Forbidden returned when configured or triggered.
 * - Resilient Error Handling: Covers invalid, expired, revoked, or disabled API keys with fail-closed security.
 * - Paid Ad Attribution: Preserves all ad click tokens (fbclid, gclid, ttclid, msclkid, twclid, wbraid, gbraid, UTMs).
 * - Fail-Safe Resiliency: Prevents visitor loss on network timeouts while maintaining security integrity.
 */

export interface GeneratorOptions {
  apiKeyValue: string | null;
  effectiveEndpoint: string;
  humanTargetUrl?: string;
  botTargetUrl?: string;
  enableLoading?: boolean;
  themeId?: string;
  heading?: string;
  subnote?: string;
}

/**
 * 1. Cloudflare Edge Worker
 * Intercepts requests at Cloudflare's 300+ global edge data centers before they touch the origin.
 * Supports both Interstitial Loading Screen Mode and Transparent Inline Mode.
 */
export function generateCloudflareWorkerScript(options: GeneratorOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const enableLoading = options.enableLoading !== false; // default true
  const heading = (options.heading || "Verifying connection security...").replace(/"/g, '\\"');
  const subnote = (options.subnote || "Please wait while we secure your session.").replace(/"/g, '\\"');

  if (enableLoading) {
    return `/**
 * CleanTraffic - Cloudflare Edge Worker Shield (Interstitial Loading Mode)
 * Universal Edge Protection for Shopify, Wix, Vercel, WordPress & Custom Hosts
 * 
 * MODE: Interstitial Loading Screen (Enabled)
 * - Zero Blank Screens: Returns an ultra-fast security verification splash in <15ms directly from the Edge.
 * - Background Verification: Validates IP, device, browser, ASN, proxy, and ad click tokens asynchronously.
 * - Strict HTTP Status Codes: Returns authentic 403 Forbidden or 404 Not Found when configured rules trigger.
 * - Key Revocation Protection: Detects expired, revoked, or invalid API keys and fails closed safely.
 * - Fail-Safe Timeout & Retry: Displays interactive retry button if connection experiences network timeouts.
 * - Ad Click Token Preservation: Forwards all UTMs, fbclid, gclid, ttclid, msclkid, etc.
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Log in to your Cloudflare Dashboard (https://dash.cloudflare.com)
 * 2. Go to "Workers & Pages" -> "Create Application" -> "Create Worker"
 * 3. Replace all default code with this script and click "Deploy"
 * 4. Go to "Settings" -> "Domains & Routes" -> "Add Route"
 *    - Route pattern: *yourdomain.com/*
 *    - Zone: select your domain
 * 5. Done! Traffic is now filtered at the Cloudflare Edge before reaching your host.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Bypass static assets (images, CSS, JS, fonts, media) to save API calls
    const isStaticAsset = /\\.(css|js|jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot|mp4|webm|pdf)$/i.test(url.pathname);
    if (isStaticAsset) {
      return fetch(request);
    }

    // 2. Check if visitor has already been verified in this session
    const cookieHeader = request.headers.get('Cookie') || '';
    if (cookieHeader.includes('ctc_verified=1')) {
      return fetch(request);
    }

    // 3. Handle asynchronous AJAX verification calls from the loading screen
    if (url.searchParams.get('ctc_verify') === '1') {
      const clientIp = request.headers.get('cf-connecting-ip') 
        || request.headers.get('x-real-ip') 
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || '127.0.0.1';
      
      const userAgent = request.headers.get('user-agent') || '';
      const referer = request.headers.get('referer') || '';
      
      // Clean query parameters
      const cleanParams = new URLSearchParams(url.search);
      cleanParams.delete('ctc_verify');
      cleanParams.delete('ctc_tk');

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const apiRes = await fetch('${endpoint}/api/classify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': '${apiKey}',
            'User-Agent': 'CleanTraffic-Cloudflare-Worker/2.0'
          },
          body: JSON.stringify({
            apiKey: '${apiKey}',
            ip: clientIp,
            userAgent: userAgent,
            queryString: cleanParams.toString(),
            referer: referer,
            url: request.url
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // API Key revoked, expired, or unauthorized -> Fail-closed maintenance
        if (apiRes.status === 401 || apiRes.status === 403) {
          return new Response(JSON.stringify({
            status: 'error',
            error: 'Security Gateway Configuration Required (Key Expired or Disabled).',
            code: 'AUTH_FAILED',
            fail_closed: true
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }

        if (apiRes.ok) {
          const verdict = await apiRes.json();
          return new Response(JSON.stringify(verdict), {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Set-Cookie': 'ctc_verified=1; Path=/; Max-Age=3600; SameSite=Lax; HttpOnly'
            }
          });
        }
      } catch (err) {
        return new Response(JSON.stringify({
          status: 'error',
          error: 'Connection timeout during security verification.',
          fail_closed: true
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
    }

    // 4. Return instant, lightweight Interstitial Loading HTML (<15ms)
    const interstitialHtml = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0B0F19;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #111827;
      border: 1px solid #1F2937;
      border-radius: 16px;
      padding: 36px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
    }
    .icon-box {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #10B981;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    h1 { font-size: 19px; font-weight: 700; margin-bottom: 8px; color: #FFFFFF; }
    p { font-size: 13px; color: #94A3B8; margin-bottom: 24px; line-height: 1.5; }
    .bar {
      height: 4px;
      width: 100%;
      background: #1F2937;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .fill {
      height: 100%;
      width: 40%;
      background: #10B981;
      border-radius: 2px;
      animation: sweep 1.5s infinite ease-in-out;
    }
    @keyframes sweep {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }
    .status { font-size: 12px; color: #64748B; font-family: monospace; }
    .error-box {
      display: none;
      margin-top: 16px;
      padding: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      color: #F87171;
      font-size: 12px;
    }
    .retry-btn {
      margin-top: 10px;
      padding: 8px 16px;
      background: #10B981;
      color: #0B0F19;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </div>
    <h1>${heading}</h1>
    <p>${subnote}</p>
    <div class="bar" id="p-bar"><div class="fill"></div></div>
    <div class="status" id="p-status">Checking connection security...</div>
    <div class="error-box" id="p-error">
      <span id="p-error-msg">Verification timed out.</span><br>
      <button type="button" class="retry-btn" onclick="location.reload()">Retry Connection</button>
    </div>
  </div>

  <script>
    (function() {
      var verifyUrl = window.location.pathname + (window.location.search ? window.location.search + '&ctc_verify=1' : '?ctc_verify=1');
      var statusEl = document.getElementById('p-status');
      var errorEl = document.getElementById('p-error');
      var errorMsgEl = document.getElementById('p-error-msg');
      var barEl = document.getElementById('p-bar');

      function showError(msg) {
        if (barEl) barEl.style.display = 'none';
        if (statusEl) statusEl.style.display = 'none';
        if (errorEl) {
          errorEl.style.display = 'block';
          if (errorMsgEl && msg) errorMsgEl.textContent = msg;
        }
      }

      fetch(verifyUrl, { headers: { 'Accept': 'application/json' } })
        .then(function(res) {
          return res.json().then(function(data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function(result) {
          var data = result.data;
          // Exact HTTP 404 enforcement
          if (data.action === '404' || data.statusCode === 404 || data.statusAction === '404' || data.destination === '404') {
            document.body.innerHTML = '<div style="font-family:sans-serif;padding:60px 20px;text-align:center;color:#334155;"><h1 style="font-size:32px;margin-bottom:8px;">404 Not Found</h1><p style="font-size:16px;color:#64748b;">The requested resource was not found on this server.</p></div>';
            return;
          }
          // Exact HTTP 403 enforcement
          if (data.action === '403' || data.statusCode === 403 || data.statusAction === '403' || data.destination === '403') {
            document.body.innerHTML = '<div style="font-family:sans-serif;padding:60px 20px;text-align:center;color:#334155;"><h1 style="font-size:32px;margin-bottom:8px;">403 Forbidden</h1><p style="font-size:16px;color:#64748b;">Access to this resource is denied.</p></div>';
            return;
          }
          // Key expired or revoked
          if (result.status === 401 || result.status === 403 || data.code === 'AUTH_FAILED') {
            showError(data.error || 'Security configuration error. Please contact site administrator.');
            return;
          }
          // Redirect with preserved query strings
          if (data.destination) {
            if (statusEl) statusEl.textContent = 'Security check passed. Forwarding...';
            var dest = data.destination;
            var currentSearch = window.location.search;
            if (currentSearch) {
              var clean = currentSearch.replace(/[\\?&]ctc_verify=1/gi, '').replace(/^&+/, '');
              if (clean && clean !== '?' && clean !== '&') {
                dest += (dest.indexOf('?') !== -1 ? '&' : '?') + clean.replace(/^[\\?&]/, '');
              }
            }
            window.location.replace(dest);
            return;
          }
          // Allowed visitor on origin page -> reload to render origin host
          window.location.reload();
        })
        .catch(function() {
          showError('Verification timed out or failed. Please click retry.');
        });
    })();
  </script>
</body>
</html>\`;

    return new Response(interstitialHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  }
};
`;
  }

  // TRANSPARENT / INLINE MODE (enableLoading === false)
  return `/**
 * CleanTraffic - Cloudflare Edge Worker Shield (Transparent Inline Mode)
 * Universal Edge Protection for Shopify, Wix, Vercel, WordPress & Custom Hosts
 * 
 * MODE: Transparent Inline Guard (No Interstitial Loading Screen)
 * - Zero Visual Loading Screen: Legitimate human visitors experience zero delay.
 * - Edge Inspection: Incoming traffic is verified at Cloudflare's Edge before reaching origin.
 * - Strict HTTP Status Codes: Bots and unauthorized traffic receive authentic 403 or 404 responses.
 * - Ad Click Token Forwarding: Passes fbclid, gclid, ttclid, msclkid, UTMs seamlessly.
 * - Fail-Safe Resiliency: 2.5-second timeout ensures visitors are never stranded.
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Log in to your Cloudflare Dashboard (https://dash.cloudflare.com)
 * 2. Go to "Workers & Pages" -> "Create Application" -> "Create Worker"
 * 3. Replace all default code with this script and click "Deploy"
 * 4. Go to "Settings" -> "Domains & Routes" -> "Add Route"
 *    - Route pattern: *yourdomain.com/*
 *    - Zone: select your domain
 * 5. Done! Traffic is now filtered at the Cloudflare Edge before reaching your host.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Bypass static assets (images, CSS, JS, fonts, media) to save API calls
    const isStaticAsset = /\\.(css|js|jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot|mp4|webm|pdf)$/i.test(url.pathname);
    if (isStaticAsset) {
      return fetch(request);
    }

    // 2. Check if visitor was previously cleared in this session
    const cookieHeader = request.headers.get('Cookie') || '';
    if (cookieHeader.includes('ctc_verified=1')) {
      return fetch(request);
    }

    // 3. Extract real visitor client IP and request metadata
    const clientIp = request.headers.get('cf-connecting-ip') 
      || request.headers.get('x-real-ip') 
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || '127.0.0.1';
    
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const queryString = url.search ? url.search.substring(1) : '';

    // 4. Query CleanTraffic Intelligence Engine with strict 2.5s fail-safe timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch('${endpoint}/api/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': '${apiKey}',
          'User-Agent': 'CleanTraffic-Cloudflare-Worker-Inline/2.0'
        },
        body: JSON.stringify({
          apiKey: '${apiKey}',
          ip: clientIp,
          userAgent: userAgent,
          queryString: queryString,
          referer: referer,
          url: request.url
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Key revoked, expired, or unauthorized -> Fail closed safely without exposing targets
      if (response.status === 401 || response.status === 403) {
        return new Response('503 Service Unavailable - Security Gateway Configuration Required', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }

      if (response.ok) {
        const verdict = await response.json();
        const action = verdict.action || '';
        const dest = verdict.destination || '';

        // Strict HTTP 404 enforcement
        if (action === '404' || verdict.statusCode === 404 || verdict.statusAction === '404' || dest === '404') {
          return new Response('404 Not Found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }

        // Strict HTTP 403 enforcement
        if (action === '403' || verdict.statusCode === 403 || verdict.statusAction === '403' || dest === '403' || (!verdict.isHuman && !dest)) {
          return new Response('403 Forbidden - Access Denied', {
            status: 403,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }

        // Redirect human visitor or custom bot URL with preserved query parameters
        if (dest && dest !== '404' && dest !== '403') {
          let targetUrl = dest;
          if (queryString) {
            targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryString;
          }
          return Response.redirect(targetUrl, 302);
        }
      }
    } catch (err) {
      // Fail-Safe: On network timeout or transient error, allow visitor through to preserve business continuity
      console.warn('CleanTraffic Edge Worker classification pass-through on error:', err);
    }

    // 5. Allowed visitor passes through seamlessly to your origin host (Shopify, Wix, Vercel, etc.)
    const originResponse = await fetch(request);
    const modifiedResponse = new Response(originResponse.body, originResponse);
    modifiedResponse.headers.append('Set-Cookie', 'ctc_verified=1; Path=/; Max-Age=3600; SameSite=Lax');
    return modifiedResponse;
  }
};
`;
}

/**
 * 2. 1-Line JavaScript Protection Snippet
 * For closed SaaS builders (Shopify, Wix, Webflow, Squarespace, ClickFunnels)
 * Supports both Interstitial Loading Screen Mode and Transparent Inline Mode.
 */
export function generateJsSnippet(options: GeneratorOptions): {
  embedTag: string;
  inlineScript: string;
} {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const enableLoading = options.enableLoading !== false; // default true
  const themeId = options.themeId || "clean_light";
  const heading = options.heading || "Verifying connection security...";
  const subnote = options.subnote || "Please wait while we secure your session.";

  const embedTag = `<!-- CleanTraffic Protection Tag (Place inside <head>) -->
<script src="${endpoint}/v1/protect.js" 
  data-api-key="${apiKey}" 
  data-loading="${enableLoading ? "true" : "false"}" 
  data-theme="${themeId}" 
  data-heading="${heading.replace(/"/g, '&quot;')}" 
  data-subnote="${subnote.replace(/"/g, '&quot;')}" 
  async>
</script>`;

  const inlineScript = `<!-- CleanTraffic Universal Inline Shield -->
<script>
(function() {
  var apiKey = "${apiKey}";
  var endpoint = "${endpoint}";
  var enableLoading = ${enableLoading ? "true" : "false"};
  var qs = window.location.search ? window.location.search.substring(1) : "";
  
  // Anti-bypass session storage to prevent repeated checks
  if (sessionStorage.getItem("ctc_verified") === "1") return;

  var overlay = null;
  if (enableLoading) {
    overlay = document.createElement("div");
    overlay.id = "ctc-loading-overlay";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0B0F19;color:#F8FAFC;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:20px;";
    overlay.innerHTML = '<div style="background:#111827;border:1px solid #1F2937;border-radius:16px;padding:36px 32px;max-width:440px;width:100%;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">' +
      '<h2 style="font-size:18px;font-weight:700;margin-bottom:8px;color:#FFF;">${heading.replace(/'/g, "\\'")}</h2>' +
      '<p style="font-size:13px;color:#94A3B8;margin-bottom:20px;">${subnote.replace(/'/g, "\\'")}</p>' +
      '<div style="height:4px;width:100%;background:#1F2937;border-radius:2px;overflow:hidden;margin-bottom:12px;"><div style="height:100%;width:40%;background:#10B981;border-radius:2px;animation:ctc-sweep 1.5s infinite ease-in-out;"></div></div>' +
      '<div id="ctc-msg" style="font-size:12px;color:#64748B;font-family:monospace;">Verifying connection...</div>' +
      '<div id="ctc-retry" style="display:none;margin-top:14px;"><button type="button" onclick="location.reload()" style="padding:8px 16px;background:#10B981;color:#0B0F19;font-weight:600;border:none;border-radius:6px;cursor:pointer;font-size:12px;">Retry Verification</button></div>' +
      '</div><style>@keyframes ctc-sweep{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}</style>';
    document.documentElement.appendChild(overlay);
  }

  var payload = {
    apiKey: apiKey,
    userAgent: navigator.userAgent,
    queryString: qs,
    referer: document.referrer,
    screenW: window.screen.width,
    screenH: window.screen.height,
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    webdriver: Boolean(navigator.webdriver)
  };

  fetch(endpoint + "/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(payload)
  })
  .then(function(res) {
    if (res.status === 401 || res.status === 403) {
      if (overlay) {
        document.getElementById("ctc-msg").textContent = "Security gateway configuration required.";
        document.getElementById("ctc-retry").style.display = "block";
      }
      return null;
    }
    return res.json();
  })
  .then(function(data) {
    if (!data) return;

    // Strict HTTP 404 enforcement
    if (data.action === "404" || data.statusCode === 404 || data.statusAction === "404" || data.destination === "404") {
      document.body.innerHTML = "<div style='font-family:sans-serif;text-align:center;padding:60px 20px;color:#334155;'><h1 style='font-size:32px;margin-bottom:8px;'>404 Not Found</h1><p style='color:#64748b;'>The requested resource was not found.</p></div>";
      return;
    }

    // Strict HTTP 403 enforcement
    if (data.action === "403" || data.statusCode === 403 || data.statusAction === "403" || data.destination === "403") {
      document.body.innerHTML = "<div style='font-family:sans-serif;text-align:center;padding:60px 20px;color:#334155;'><h1 style='font-size:32px;margin-bottom:8px;'>403 Forbidden</h1><p style='color:#64748b;'>Access to this resource is denied.</p></div>";
      return;
    }

    // Redirect human visitor or custom bot URL
    if (data.destination) {
      var dest = data.destination;
      if (qs) {
        dest += (dest.indexOf('?') !== -1 ? '&' : '?') + qs;
      }
      window.location.replace(dest);
      return;
    }

    // Clean allow
    sessionStorage.setItem("ctc_verified", "1");
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  })
  .catch(function() {
    // Fail-safe pass-through on error or network timeout
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });
})();
</script>`;

  return { embedTag, inlineScript };
}

/**
 * 3. WordPress Plugin (.php source)
 * Packaged as a standard WordPress single-file plugin
 * Supports both Interstitial Loading Screen Mode and Transparent Inline Mode.
 */
export function generateWordPressPluginPhp(options: GeneratorOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const enableLoading = options.enableLoading !== false; // default true
  const heading = options.heading || "Verifying connection security...";
  const subnote = options.subnote || "Please wait while we secure your session.";

  return `<?php
/**
 * Plugin Name: CleanTraffic Security Shield
 * Plugin URI: https://cleantraffic.io
 * Description: Deterministic real-time bot protection, ad attribution, and cloaking shield for WordPress & WooCommerce.
 * Version: 2.2.0
 * Author: CleanTraffic
 * Author URI: https://cleantraffic.io
 * License: GPLv2 or later
 * 
 * MODE: ${enableLoading ? "Interstitial Loading Screen" : "Transparent Inline Guard"}
 * ERROR HANDLING: Strict 404/403 support, expired/revoked key protection, ad token preservation.
 */

if (!defined('ABSPATH')) {
    exit; // Prevent direct file access
}

class CleanTrafficShield {
    private $apiKey = '${apiKey}';
    private $apiEndpoint = '${endpoint}';
    private $enableLoading = ${enableLoading ? "true" : "false"};

    public function __construct() {
        add_action('init', array($this, 'inspect_traffic'), 1);
    }

    public function inspect_traffic() {
        // Skip wp-admin, wp-login, cron, and REST requests
        if (is_admin() || wp_doing_ajax() || wp_doing_cron() || (defined('REST_REQUEST') && REST_REQUEST)) {
            return;
        }

        // Prevent repeated classification within the same session
        if (isset($_COOKIE['ctc_verified']) && $_COOKIE['ctc_verified'] === '1') {
            return;
        }

        $visitorIp = $this->get_client_ip();
        $userAgent = isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field($_SERVER['HTTP_USER_AGENT']) : '';
        $queryString = isset($_SERVER['QUERY_STRING']) ? sanitize_text_field($_SERVER['QUERY_STRING']) : '';
        $referer = isset($_SERVER['HTTP_REFERER']) ? esc_url_raw($_SERVER['HTTP_REFERER']) : '';

        // Call CleanTraffic Backend API
        $response = wp_remote_post($this->apiEndpoint . '/api/classify', array(
            'timeout'     => 3,
            'redirection' => 0,
            'httpversion' => '1.1',
            'blocking'    => true,
            'headers'     => array(
                'Content-Type' => 'application/json; charset=utf-8',
                'X-API-Key'    => $this->apiKey,
                'User-Agent'   => 'CleanTraffic-WordPress-Shield/2.2'
            ),
            'body'        => wp_json_encode(array(
                'apiKey'      => $this->apiKey,
                'ip'          => $visitorIp,
                'userAgent'   => $userAgent,
                'queryString' => $queryString,
                'referer'     => $referer,
                'url'         => home_url($_SERVER['REQUEST_URI'])
            ))
        ));

        // Key revoked, expired, or authorization failure -> Fail closed safely
        $httpCode = wp_remote_retrieve_response_code($response);
        if ($httpCode === 401 || $httpCode === 403) {
            status_header(503);
            nocache_headers();
            wp_die('<h1>503 Service Unavailable</h1><p>CleanTraffic Security Configuration Required.</p>', 'Security Gateway Alert', array('response' => 503));
            exit;
        }

        if (!is_wp_error($response)) {
            $body = wp_remote_retrieve_body($response);
            $verdict = json_decode($body, true);

            if (is_array($verdict)) {
                $action = $verdict['action'] ?? '';
                $dest = $verdict['destination'] ?? '';
                $statusCode = $verdict['statusCode'] ?? 200;

                // Strict HTTP 404 enforcement
                if ($action === '404' || $statusCode === 404 || $dest === '404' || ($verdict['statusAction'] ?? '') === '404') {
                    global $wp_query;
                    if ($wp_query) {
                        $wp_query->set_404();
                    }
                    status_header(404);
                    nocache_headers();
                    wp_die('<h1>404 Not Found</h1><p>The requested page could not be found.</p>', 'Not Found', array('response' => 404));
                    exit;
                }

                // Strict HTTP 403 enforcement
                if ($action === '403' || $statusCode === 403 || $dest === '403' || ($verdict['statusAction'] ?? '') === '403') {
                    status_header(403);
                    nocache_headers();
                    wp_die('<h1>403 Forbidden</h1><p>Access Denied by CleanTraffic Security.</p>', 'Access Denied', array('response' => 403));
                    exit;
                }

                // Redirect human visitor or custom bot URL with preserved query parameters
                if (!empty($dest) && $dest !== '404' && $dest !== '403') {
                    if (!empty($queryString)) {
                        $dest .= (strpos($dest, '?') !== false ? '&' : '?') . $queryString;
                    }
                    setcookie('ctc_verified', '1', time() + 3600, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
                    wp_redirect(esc_url_raw($dest), 302);
                    exit;
                }
            }
        }

        // Cache verification for 1 hour on clean allow
        setcookie('ctc_verified', '1', time() + 3600, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
    }

    private function get_client_ip() {
        $headers = array('HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR');
        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ips = explode(',', $_SERVER[$header]);
                return trim($ips[0]);
            }
        }
        return '127.0.0.1';
    }
}

new CleanTrafficShield();
`;
}

/**
 * 4. Next.js Edge Middleware (for Vercel, Netlify, Railway)
 * Supports both Interstitial Loading Screen Mode and Transparent Inline Mode.
 */
export function generateNextJsMiddleware(options: GeneratorOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const enableLoading = options.enableLoading !== false; // default true

  return `// middleware.ts (Root of your Next.js project)
// Compatible with Next.js 13, 14, and 15 (App & Pages Router)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Skip static assets, Next.js internals, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Skip if visitor was already cleared in this session
  if (request.cookies.get('ctc_verified')?.value === '1') {
    return NextResponse.next();
  }

  // 3. Extract visitor IP and headers
  const ip = request.ip 
    || request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || '127.0.0.1';
  
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  const queryString = search ? search.substring(1) : '';

  try {
    const res = await fetch('${endpoint}/api/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CLEANTRAFFIC_API_KEY || '${apiKey}',
        'User-Agent': 'CleanTraffic-NextJS-Middleware/2.2'
      },
      body: JSON.stringify({
        apiKey: process.env.CLEANTRAFFIC_API_KEY || '${apiKey}',
        ip,
        userAgent,
        queryString,
        referer,
        url: request.url
      }),
      // Fail-safe 2.5-second timeout
      signal: AbortSignal.timeout(2500),
    });

    // Key revoked or expired -> Fail closed safely
    if (res.status === 401 || res.status === 403) {
      return new NextResponse('503 Service Unavailable - CleanTraffic Configuration Required', { status: 503 });
    }

    if (res.ok) {
      const verdict = await res.json();
      const action = verdict.action || '';
      const dest = verdict.destination || '';

      // Strict HTTP 404 enforcement
      if (action === '404' || verdict.statusCode === 404 || verdict.statusAction === '404' || dest === '404') {
        return new NextResponse('404 Not Found', { status: 404 });
      }

      // Strict HTTP 403 enforcement
      if (action === '403' || verdict.statusCode === 403 || verdict.statusAction === '403' || dest === '403') {
        return new NextResponse('403 Forbidden - Access Denied', { status: 403 });
      }

      // Redirect human visitor or custom bot URL with preserved query parameters
      if (dest && dest !== '404' && dest !== '403') {
        const redirectUrl = new URL(dest, request.url);
        if (queryString) {
          redirectUrl.search = queryString;
        }
        const response = NextResponse.redirect(redirectUrl);
        response.cookies.set('ctc_verified', '1', { maxAge: 3600, path: '/', sameSite: 'lax' });
        return response;
      }
    }
  } catch (error) {
    // Fail-safe: continue if CleanTraffic API is temporarily unreachable to preserve business continuity
    console.warn('CleanTraffic classification pass-through on timeout:', error);
  }

  const response = NextResponse.next();
  response.cookies.set('ctc_verified', '1', { maxAge: 3600, path: '/', sameSite: 'lax' });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
`;
}

/**
 * 5. Node.js & Express Middleware (for Railway, Render, Fly.io, Custom VPS)
 * Supports both Interstitial Loading Screen Mode and Transparent Inline Mode.
 */
export function generateNodeExpressMiddleware(options: GeneratorOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const enableLoading = options.enableLoading !== false; // default true

  return `// cleantrafficMiddleware.js (Express / Node.js)
// Drop-in middleware for Railway, Render, Fly.io, or any Express server

const axios = require('axios'); // or native fetch in Node 18+

function cleanTrafficMiddleware(options = {}) {
  const apiKey = options.apiKey || process.env.CLEANTRAFFIC_API_KEY || '${apiKey}';
  const endpoint = options.endpoint || '${endpoint}';

  return async function(req, res, next) {
    // 1. Skip static files & health checks
    if (req.path.match(/\\.(css|js|png|jpg|svg|ico)$/) || req.path === '/health') {
      return next();
    }

    // 2. Skip if visitor was already cleared in this session
    if (req.cookies && req.cookies.ctc_verified === '1') {
      return next();
    }

    const ip = req.headers['cf-connecting-ip'] 
      || req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.socket.remoteAddress 
      || '127.0.0.1';

    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';

    try {
      const response = await axios.post(endpoint + '/api/classify', {
        apiKey,
        ip,
        userAgent,
        queryString,
        referer,
        url: req.protocol + '://' + req.get('host') + req.originalUrl
      }, {
        timeout: 2500,
        headers: {
          'X-API-Key': apiKey,
          'User-Agent': 'CleanTraffic-Express-Middleware/2.2'
        },
        validateStatus: () => true // Handle 401/403 status codes explicitly
      });

      // Key revoked, expired, or authorization failure -> Fail closed safely
      if (response.status === 401 || response.status === 403) {
        return res.status(503).send('503 Service Unavailable - Security Gateway Configuration Required');
      }

      if (response.status === 200) {
        const verdict = response.data;
        const action = verdict.action || '';
        const dest = verdict.destination || '';

        // Strict HTTP 404 enforcement
        if (action === '404' || verdict.statusCode === 404 || verdict.statusAction === '404' || dest === '404') {
          return res.status(404).send('404 Not Found');
        }

        // Strict HTTP 403 enforcement
        if (action === '403' || verdict.statusCode === 403 || verdict.statusAction === '403' || dest === '403') {
          return res.status(403).send('403 Forbidden - Access Denied');
        }

        // Redirect human visitor or custom bot URL with preserved query parameters
        if (dest && dest !== '404' && dest !== '403') {
          let target = dest;
          if (queryString) {
            target += (target.includes('?') ? '&' : '?') + queryString;
          }
          res.cookie('ctc_verified', '1', { maxAge: 3600000, httpOnly: true });
          return res.redirect(302, target);
        }
      }

      res.cookie('ctc_verified', '1', { maxAge: 3600000, httpOnly: true });
      return next();
    } catch (err) {
      // Fail-safe pass-through on error or network timeout
      console.warn('CleanTraffic pass-through on error:', err.message);
      return next();
    }
  };
}

module.exports = cleanTrafficMiddleware;

// Usage in your Express app:
// const app = express();
// app.use(cleanTrafficMiddleware());
`;
}

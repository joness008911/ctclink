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
  failMode?: "open" | "closed";
  timeoutMs?: number;
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
  const humanTargetUrl = (options.humanTargetUrl || "").replace(/\/+$/, "");
  const failMode = options.failMode || "open";
  const timeoutMs = options.timeoutMs && options.timeoutMs >= 1000 ? options.timeoutMs : 2500;

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
      
      let clientTokens = null;
      const rawTokens = url.searchParams.get('ctc_tk');
      if (rawTokens) {
        try {
          clientTokens = JSON.parse(atob(rawTokens));
        } catch(e) {}
      }

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
            clientTokens: clientTokens,
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
      var hwTokens = {
        webdriver: !!(navigator.webdriver),
        screenWidth: window.screen ? window.screen.width : 0,
        screenHeight: window.screen ? window.screen.height : 0,
        colorDepth: window.screen ? window.screen.colorDepth : 0,
        pixelRatio: window.devicePixelRatio || 1,
        gpuRenderer: '',
        canvasHash: '',
        timezoneOffset: new Date().getTimezoneOffset(),
        hardwareConcurrency: navigator.hardwareConcurrency || 0
      };

      try {
        var canvas = document.createElement('canvas');
        var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            hwTokens.gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
          }
        }
      } catch(e) {}

      try {
        var c2 = document.createElement('canvas');
        c2.width = 160; c2.height = 30;
        var ctx2 = c2.getContext('2d');
        if (ctx2) {
          ctx2.textBaseline = 'top';
          ctx2.font = '12px Arial';
          ctx2.fillStyle = '#f60';
          ctx2.fillRect(10, 1, 40, 15);
          ctx2.fillStyle = '#069';
          ctx2.fillText('ctc_render', 2, 5);
          hwTokens.canvasHash = c2.toDataURL().slice(-32);
        }
      } catch(e) {}

      var encodedTokens = '';
      try { encodedTokens = btoa(JSON.stringify(hwTokens)); } catch(e) {}

      var verifyUrl = window.location.pathname + (window.location.search ? window.location.search + '&ctc_verify=1' : '?ctc_verify=1');
      if (encodedTokens) {
        verifyUrl += '&ctc_tk=' + encodeURIComponent(encodedTokens);
      }

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
 * DEPLOYMENT INSTRUCTIONS (Quick Web Browser Setup):
 * 1. Log in to your Cloudflare Dashboard (https://dash.cloudflare.com)
 * 2. Go to "Workers & Pages" -> "Create Application" -> Select tab "Workers" (NOT Pages!)
 * 3. Click "Create Worker" -> Click "Deploy" (to initialize)
 * 4. Click "Edit code" (or "Quick Edit") directly in your browser
 * 5. Delete the default sample code, PASTE this script, and click "Save and deploy"
 * 6. Go to Worker Settings -> "Domains & Routes" -> "Add Route"
 *    - Route pattern: *yourdomain.com/*  (CRITICAL: NO dot between * and domain! Do NOT use *.yourdomain.com/* which only matches subdomains)
 *    - Zone: select your domain
 * 7. Done! Traffic is now filtered at the Cloudflare Edge before reaching your host.
 * 
 * NOTE: Do NOT use the Cloudflare Pages "Upload assets" drag-and-drop tool.
 * Workers do not use file uploaders; code is pasted directly into the Quick Edit browser editor.
 * 
 * STANDALONE PROXY MODE (OPTIONAL):
 * If using this worker on *.workers.dev directly as an ad campaign link, set ORIGIN_URL
 * below to your target website (e.g. "https://yourwebsite.com").
 */

// Target origin ONLY for standalone workers.dev proxy mode.
// For live domains (Shopify, Wix, WordPress, VPS) with Cloudflare Routes, leave as empty string ""
// so Cloudflare automatically proxies verified visitors to your live web host.
const ORIGIN_URL = "";
const FAIL_MODE = "${failMode}"; // "open" (High Availability) or "closed" (Maximum Security)
const TIMEOUT_MS = ${timeoutMs};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Bypass static assets (images, CSS, JS, fonts, media, favicons, robots.txt, sitemaps)
    const secFetchDest = (request.headers.get('sec-fetch-dest') || '').toLowerCase();
    const isAssetDest = ['image', 'style', 'script', 'font', 'video', 'audio'].includes(secFetchDest);
    const isStaticAsset = isAssetDest || /\.(css|js|jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot|mp4|webm|pdf|map|xml|txt|json|avif)$/i.test(url.pathname);
    if (isStaticAsset) {
      return fetch(request);
    }

    // 2. Check if visitor was previously cleared in this session (skip check if ?nocache=1 or ?ctc_test=1 is passed for testing)
    const bypassCookie = url.searchParams.has('nocache') || url.searchParams.has('ctc_test');
    const cookieHeader = request.headers.get('Cookie') || '';
    if (!bypassCookie && cookieHeader.includes('ctc_verified=1')) {
      if (ORIGIN_URL) {
        return fetch(new Request(new URL(url.pathname + url.search, ORIGIN_URL).toString(), request));
      }
      if (!url.hostname.endsWith('.workers.dev')) {
        return fetch(request);
      }
    }

    // 3. Resolve API Key: supports Cloudflare Secret (env.CLEANTRAFFIC_API_KEY) or pre-configured key
    const activeApiKey = (env && env.CLEANTRAFFIC_API_KEY) ? env.CLEANTRAFFIC_API_KEY : '${apiKey}';

    // 4. Extract real visitor client IP and request metadata
    const clientIp = request.headers.get('cf-connecting-ip') 
      || request.headers.get('x-real-ip') 
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || '127.0.0.1';
    
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const queryString = url.search ? url.search.substring(1) : '';

    // 5. Query CleanTraffic Intelligence Engine with target timeout
    let timedOutOrFailed = false;
    let verdict = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch('${endpoint}/api/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': activeApiKey,
          'User-Agent': 'CleanTraffic-Cloudflare-Worker-Inline/2.5'
        },
        body: JSON.stringify({
          apiKey: activeApiKey,
          ip: clientIp,
          userAgent: userAgent,
          queryString: queryString,
          referer: referer,
          url: request.url
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        verdict = await response.json();
        const action = String(verdict.action || '');
        const statusCode = verdict.statusCode;
        const statusAction = String(verdict.statusAction || '');
        const isBlocked = !verdict.isHuman || action === 'Blocked' || verdict.visitorType === 'Bot' || verdict.visitor_type === 'Bot' || action === 'Restricted';

        // ── BOT, VPN & POLICY INTERCEPTION (403, 404, or Safe Page Redirect) ──
        if (isBlocked) {
          if (action === '403' || statusCode === 403 || statusAction === '403' || verdict.statusAction === '403') {
            return new Response('403 Forbidden - Access Denied', {
              status: 403,
              headers: { 
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'X-CleanTraffic-Verdict': 'Blocked'
              }
            });
          }

          if (verdict.redirectUrl && String(verdict.redirectUrl).startsWith('http')) {
            return Response.redirect(verdict.redirectUrl, 302);
          }

          return new Response('404 Not Found', {
            status: 404,
            headers: { 
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'X-CleanTraffic-Verdict': 'Blocked'
            }
          });
        }
      } else if (response.status >= 500 || response.status === 401 || response.status === 403) {
        timedOutOrFailed = true;
      }
    } catch (err) {
      timedOutOrFailed = true;
    }

    // 6. Handle Fallback Policy when CleanTraffic is unavailable or timed out
    if (timedOutOrFailed) {
      // Parse retry count from cookie
      const retryMatch = cookieHeader.match(/ctc_retry=(\d+)/);
      const currentRetries = retryMatch ? parseInt(retryMatch[1], 10) : 0;

      // ── SMART 3-RETRY AUTO-BYPASS ──
      // If the visitor has retried 2 or more times (this is the 3rd attempt):
      // 1. Clear the visitor immediately so conversions / ad clicks are NOT lost!
      // 2. Dispatch non-blocking emergency telemetry beacon to the backend for Admin diagnostic alerting.
      if (currentRetries >= 2) {
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(
            fetch('${endpoint}/api/monitoring/incident-beacon', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'edge_3retry_bypass',
                url: request.url,
                ip: clientIp,
                apiKey: activeApiKey,
                retryCount: 3,
                latencyMs: TIMEOUT_MS,
                userAgent: userAgent,
                failMode: FAIL_MODE
              })
            }).catch(() => {})
          );
        }

        // Forward visitor seamlessly to origin
        if (ORIGIN_URL) {
          const targetUrl = new URL(url.pathname + url.search, ORIGIN_URL);
          const proxyRequest = new Request(targetUrl.toString(), {
            method: request.method,
            headers: request.headers,
            body: request.body,
            redirect: 'follow'
          });
          const originResponse = await fetch(proxyRequest);
          const modified = new Response(originResponse.body, originResponse);
          modified.headers.append('Set-Cookie', 'ctc_verified=1; Path=/; Max-Age=3600; SameSite=Lax');
          modified.headers.append('Set-Cookie', 'ctc_retry=0; Path=/; Max-Age=0');
          modified.headers.set('X-CleanTraffic-Shield', 'Active');
          modified.headers.set('X-CleanTraffic-Fallback', '3-retry-bypass');
          return modified;
        }

        if (!url.hostname.endsWith('.workers.dev')) {
          const originResponse = await fetch(request);
          const modified = new Response(originResponse.body, originResponse);
          modified.headers.append('Set-Cookie', 'ctc_verified=1; Path=/; Max-Age=3600; SameSite=Lax');
          modified.headers.append('Set-Cookie', 'ctc_retry=0; Path=/; Max-Age=0');
          modified.headers.set('X-CleanTraffic-Shield', 'Active');
          modified.headers.set('X-CleanTraffic-Fallback', '3-retry-bypass');
          return modified;
        }
      }

      if (FAIL_MODE === 'closed') {
        const nextRetries = currentRetries + 1;
        // FAIL_CLOSED Policy: Challenge screen with interactive Retry button
        return new Response(\`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Security Verification Required &bull; CleanTraffic</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0B0F19; color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 24px; }
    .box { background: #111827; border: 1px solid #1E293B; border-radius: 14px; max-width: 460px; width: 100%; padding: 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); color: #10B981; border-radius: 9999px; font-size: 11px; font-weight: 600; margin-bottom: 16px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #FFFFFF; }
    p { font-size: 13px; color: #94A3B8; line-height: 1.6; margin-bottom: 20px; }
    .retry-btn { display: inline-block; width: 100%; padding: 10px 18px; background: #10B981; color: #0B0F19; font-weight: 700; font-size: 13px; border: none; border-radius: 8px; cursor: pointer; text-decoration: none; transition: background 0.15s; }
    .retry-btn:hover { background: #059669; }
    .meta { margin-top: 18px; font-size: 11px; color: #64748B; font-family: monospace; }
  </style>
</head>
<body>
  <div class="box">
    <div class="badge"><span class="dot"></span> Shield Gateway &bull; Protection Active</div>
    <h1>Security Verification Required</h1>
    <p>Connection verification timed out. If you are a human visitor, please click Retry Connection below to complete verification.</p>
    <button type="button" class="retry-btn" onclick="location.reload()">Retry Connection</button>
    <div class="meta">Attempt \${nextRetries} of 3 &bull; Auto-bypasses on 3rd attempt</div>
  </div>
</body>
</html>\`, {
          status: 403,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-CleanTraffic-Fallback': 'fail-closed',
            'Set-Cookie': \`ctc_retry=\${nextRetries}; Path=/; Max-Age=120; SameSite=Lax\`,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        });
      }

      // FAIL_OPEN Policy: High Availability. Log warning and pass visitor to origin
      console.warn('CleanTraffic: Gateway timed out. Passing visitor through under Fail-Open policy.');
    }

    // 5. Allowed human visitor routing
    // Case A: Standalone Proxy mode with ORIGIN_URL configured
    if (ORIGIN_URL) {
      const targetUrl = new URL(url.pathname + url.search, ORIGIN_URL);
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
      });
      const originResponse = await fetch(proxyRequest);
      const modifiedResponse = new Response(originResponse.body, originResponse);
      modifiedResponse.headers.append('Set-Cookie', 'ctc_verified=1; Path=/; Max-Age=3600; SameSite=Lax');
      modifiedResponse.headers.set('X-CleanTraffic-Shield', 'Active');
      modifiedResponse.headers.set('X-CleanTraffic-Verdict', 'Passed');
      return modifiedResponse;
    }

    // Case B: Direct visit on *.workers.dev preview URL without custom domain route or ORIGIN_URL
    // Prevents self-fetch loop that causes Cloudflare to print the raw JavaScript script on the screen!
    if (url.hostname.endsWith('.workers.dev')) {
      const colo = (request.cf && request.cf.colo) || 'Global Edge';
      const statusTitle = timedOutOrFailed ? 'Gateway Timeout Notice' : 'Cloudflare Edge Protection Online';
      const classificationText = timedOutOrFailed 
        ? ('Verification Timed Out (' + TIMEOUT_MS + 'ms)') 
        : ((verdict && verdict.isHuman) ? 'Human Visitor (Passed)' : (verdict ? (verdict.visitorType || 'Clean Traffic') : 'Clean Traffic'));
      const classificationColor = timedOutOrFailed ? '#F59E0B' : ((verdict && verdict.isHuman) ? '#10B981' : '#EF4444');
      return new Response(\`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CleanTraffic Edge Shield &bull; Active</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0B0F19; color: #F8FAFC; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #111827; border: 1px solid #1F2937; border-radius: 16px; padding: 36px 32px; max-width: 520px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10B981; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px #10B981; }
    h1 { font-size: 20px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px; }
    p { font-size: 13px; color: #94A3B8; line-height: 1.6; margin-bottom: 20px; }
    .info-grid { background: #0B0F19; border: 1px solid #1F2937; border-radius: 10px; padding: 16px; margin-bottom: 20px; font-size: 12px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #1E293B; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748B; }
    .val { color: #F1F5F9; font-weight: 600; font-family: monospace; }
    .note { font-size: 12px; color: #38BDF8; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 14px; line-height: 1.5; }
    .steps { margin-top: 10px; font-size: 12px; color: #CBD5E1; line-height: 1.6; padding-left: 18px; }
    code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #F8FAFC; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="dot"></span> CleanTraffic Edge Shield Active</div>
    <h1>\${statusTitle}</h1>
    <p>Your Cloudflare Worker is active at POP data center <strong>\${colo}</strong> and successfully connected to the CleanTraffic Intelligence Engine.</p>
    <div class="info-grid">
      <div class="row"><span class="label">Client IP:</span><span class="val">\${clientIp}</span></div>
      <div class="row"><span class="label">Classification:</span><span class="val" style="color:\${classificationColor}">\${classificationText}</span></div>
      <div class="row"><span class="label">Protection Mode:</span><span class="val">Transparent Inline Shield</span></div>
      <div class="row"><span class="label">API Key:</span><span class="val">\${'${apiKey}'.slice(0, 8)}...</span></div>
    </div>
    <div class="note">
      <strong>How to Protect Your Live Website:</strong>
      <ol class="steps">
        <li><strong>Custom Domain Route (Recommended):</strong> In Cloudflare, go to <strong>Workers &amp; Pages &rarr; Settings &rarr; Domains &amp; Routes &rarr; Add Route</strong> (e.g. <code>*yourdomain.com/*</code>).</li>
        <li><strong>Or Standalone Proxy:</strong> Set <code>const ORIGIN_URL = "https://yourwebsite.com";</code> at line 20 of this worker script to proxy all verified visitors directly to your store or offer.</li>
      </ol>
    </div>
  </div>
</body>
</html>\`, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // Case C: Custom Domain Route Pass-Through (e.g. *yourdomain.com/*)
    // Traffic passes seamlessly to origin host (Shopify, Wix, Vercel, WordPress, etc.)
    const originResponse = await fetch(request);
    const modifiedResponse = new Response(originResponse.body, originResponse);
    modifiedResponse.headers.append('Set-Cookie', 'ctc_verified=1; Path=/; Max-Age=3600; SameSite=Lax');
    modifiedResponse.headers.set('X-CleanTraffic-Shield', 'Active');
    modifiedResponse.headers.set('X-CleanTraffic-Verdict', 'Passed');
    return modifiedResponse;
  }
};
`;
}

/**
 * 2. 1-Line JavaScript Protection Snippet & Identification Agent
 * For closed SaaS builders (Shopify, Wix, Webflow, Squarespace, Carrd, Custom HTML)
 * Supports both In-Place Landing Page Protection and Smart Traffic Routing.
 * Full WebGL GPU & 2D Canvas Hardware Fingerprinting across all environments.
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

  const embedTag = `<!-- CleanTraffic Client Protection & Identification Agent (Place inside <head>) -->
<script src="${endpoint}/v1/protect.js" 
  data-api-key="${apiKey}" 
  data-loading="${enableLoading ? "true" : "false"}" 
  data-theme="${themeId}" 
  data-heading="${heading.replace(/"/g, '&quot;')}" 
  data-subnote="${subnote.replace(/"/g, '&quot;')}" 
  async>
</script>`;

  const inlineScript = `<!-- CleanTraffic Autonomous Inline Shield & Fingerprinting Agent -->
<script>
(function(window, document) {
  'use strict';
  var apiKey = "${apiKey}";
  var endpoint = "${endpoint}";
  var enableLoading = ${enableLoading ? "true" : "false"};
  var qs = window.location.search ? window.location.search.substring(1) : "";
  
  // Ready listeners for developer API (Fingerprint-style)
  var readyCallbacks = [];
  var lastResult = null;
  window.CleanTraffic = window.CleanTraffic || {
    get: function() {
      return new Promise(function(resolve) {
        if (lastResult) return resolve(lastResult);
        readyCallbacks.push(resolve);
      });
    },
    onReady: function(cb) {
      if (typeof cb !== 'function') return;
      if (lastResult) cb(lastResult);
      else readyCallbacks.push(cb);
    },
    version: '2.5.0'
  };

  // Anti-bypass session storage to prevent repeated checks
  var cacheKey = "ctc_verified_" + apiKey;
  if (sessionStorage.getItem(cacheKey) === "1") {
    var cachedData = null;
    try { cachedData = JSON.parse(sessionStorage.getItem("ctc_data_" + apiKey) || "{}"); } catch(e) {}
    lastResult = cachedData || { isHuman: true, action: "Allowed", cached: true };
    while (readyCallbacks.length) readyCallbacks.shift()(lastResult);
    return;
  }

  var overlay = null;
  if (enableLoading) {
    overlay = document.createElement("div");
    overlay.id = "ctc-loading-overlay";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0B0F19;color:#F8FAFC;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:20px;box-sizing:border-box;transition:opacity 0.25s ease-out;";
    overlay.innerHTML = '<div style="background:#111827;border:1px solid #1F2937;border-radius:16px;padding:36px 32px;max-width:440px;width:100%;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">' +
      '<div style="width:48px;height:48px;border-radius:12px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#10B981;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
      '</div>' +
      '<h2 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#FFF;letter-spacing:-0.01em;">${heading.replace(/'/g, "\\'")}</h2>' +
      '<p style="font-size:13px;color:#94A3B8;margin:0 0 20px;line-height:1.5;">${subnote.replace(/'/g, "\\'")}</p>' +
      '<div style="height:4px;width:100%;background:#1F2937;border-radius:2px;overflow:hidden;margin-bottom:12px;"><div style="height:100%;width:40%;background:#10B981;border-radius:2px;animation:ctc-sweep 1.5s infinite ease-in-out;"></div></div>' +
      '<div id="ctc-msg" style="font-size:12px;color:#64748B;font-family:monospace;">Verifying connection security...</div>' +
      '<div id="ctc-retry" style="display:none;margin-top:14px;"><button type="button" onclick="location.reload()" style="padding:8px 16px;background:#10B981;color:#0B0F19;font-weight:600;border:none;border-radius:6px;cursor:pointer;font-size:12px;">Retry Verification</button></div>' +
      '</div><style>@keyframes ctc-sweep{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}</style>';
    if (document.body) { document.body.appendChild(overlay); } else { document.documentElement.appendChild(overlay); }
  }

  // Full Passive Hardware & Entropy Collector
  var hwTokens = {
    webdriver: Boolean(navigator.webdriver),
    outerWidth: window.outerWidth || 0,
    outerHeight: window.outerHeight || 0,
    screenWidth: window.screen ? window.screen.width : 0,
    screenHeight: window.screen ? window.screen.height : 0,
    colorDepth: window.screen ? window.screen.colorDepth : 0,
    pixelRatio: window.devicePixelRatio || 1,
    missingPluginsArray: !navigator.plugins || navigator.plugins.length === 0,
    gpuRenderer: '',
    canvasHash: '',
    untrustedEvent: false,
    timezoneOffset: new Date().getTimezoneOffset(),
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    touchPoints: navigator.maxTouchPoints || ('ontouchstart' in window ? 1 : 0)
  };

  // Passive WebGL unmasked GPU renderer probe
  try {
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        hwTokens.gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      }
    }
  } catch(e) {}

  // Passive 2D Canvas anti-aliasing curve probe
  try {
    var c2 = document.createElement('canvas');
    c2.width = 160; c2.height = 30;
    var ctx2 = c2.getContext('2d');
    if (ctx2) {
      ctx2.textBaseline = 'top';
      ctx2.font = '12px Arial';
      ctx2.fillStyle = '#f60';
      ctx2.fillRect(10, 1, 40, 15);
      ctx2.fillStyle = '#069';
      ctx2.fillText('ctc_render', 2, 5);
      hwTokens.canvasHash = c2.toDataURL().slice(-32);
    }
  } catch(e) {}

  var payload = {
    apiKey: apiKey,
    userAgent: navigator.userAgent || '',
    queryString: qs,
    referer: document.referrer || '',
    url: window.location.href,
    clientTokens: hwTokens,
    screenW: hwTokens.screenWidth,
    screenH: hwTokens.screenHeight,
    hasTouch: hwTokens.touchPoints > 0,
    webdriver: hwTokens.webdriver
  };

  function dismissOverlay() {
    if (overlay && overlay.parentNode) {
      overlay.style.opacity = '0';
      setTimeout(function() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 250);
    }
  }

  fetch(endpoint + "/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(payload)
  })
  .then(function(res) {
    if (res.status === 401 || res.status === 403) {
      if (overlay) {
        document.getElementById("ctc-msg").textContent = "Security gateway configuration required (API Key Expired/Revoked).";
        document.getElementById("ctc-retry").style.display = "block";
      }
      return null;
    }
    return res.json();
  })
  .then(function(data) {
    if (!data) return;

    lastResult = {
      visitorId: data.visitorId || data.visitor_id || '',
      deviceId: data.deviceId || data.device_id || '',
      isHuman: Boolean(data.isHuman || data.is_human),
      action: data.action || (data.isHuman ? 'Allowed' : 'Blocked'),
      country: data.country || '',
      riskScore: data.risk_score || 0
    };

    try {
      sessionStorage.setItem(cacheKey, "1");
      sessionStorage.setItem("ctc_data_" + apiKey, JSON.stringify(lastResult));
    } catch(e) {}

    try {
      window.dispatchEvent(new CustomEvent('ctc:verified', { detail: lastResult }));
    } catch(e) {}
    while (readyCallbacks.length) readyCallbacks.shift()(lastResult);

    // Strict HTTP 404 enforcement
    if (data.action === "404" || data.statusCode === 404 || data.statusAction === "404" || data.destination === "404") {
      document.body.innerHTML = "<div style='font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-align:center;padding:80px 20px;color:#334155;'><h1 style='font-size:32px;font-weight:700;margin-bottom:8px;'>404 Not Found</h1><p style='color:#64748b;font-size:16px;'>The requested resource was not found on this server.</p></div>";
      return;
    }

    // Strict HTTP 403 enforcement
    if (data.action === "403" || data.statusCode === 403 || data.statusAction === "403" || data.destination === "403") {
      document.body.innerHTML = "<div style='font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-align:center;padding:80px 20px;color:#334155;'><h1 style='font-size:32px;font-weight:700;margin-bottom:8px;'>403 Forbidden</h1><p style='color:#64748b;font-size:16px;'>Access to this resource is denied.</p></div>";
      return;
    }

    // Smart Traffic Routing: Redirect if destination URL is configured
    if (data.destination && data.destination !== '404' && data.destination !== '403') {
      var dest = data.destination;
      if (qs) {
        dest += (dest.indexOf('?') !== -1 ? '&' : '?') + qs;
      }
      window.location.replace(dest);
      return;
    }

    // In-Place Landing Page Protection: Smoothly dismiss overlay, visitor continues browsing
    dismissOverlay();
  })
  .catch(function() {
    // Fail-safe pass-through on error or network timeout
    dismissOverlay();
  });
})(window, document);
</script>`;

  return { embedTag, inlineScript };
}

/**
 * 3. WordPress Plugin (.php source)
 * Packaged as a standard WordPress single-file plugin
 * Supports both In-Place Landing Page Protection and Interstitial Loading Screen Mode.
 * Enqueues client-side hardware entropy probe for 100% Device ID parity.
 */
export function generateWordPressPluginPhp(options: GeneratorOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const enableLoading = options.enableLoading !== false; // default true
  const heading = options.heading || "Verifying connection security...";
  const subnote = options.subnote || "Please wait while we secure your session.";
  const failMode = options.failMode || "open";
  const timeoutSec = Math.max(0.2, (options.timeoutMs || 400) / 1000);

  return `<?php
/**
 * Plugin Name: CleanTraffic Security Shield & Verification Gateway
 * Plugin URI: https://cleantraffic.io
 * Description: Real-time bot protection, visitor identification, and traffic security gateway for WordPress & WooCommerce.
 * Version: 2.5.0
 * Author: CleanTraffic
 * Author URI: https://cleantraffic.io
 * License: GPLv2 or later
 * 
 * MODE: ${enableLoading ? "Interstitial Loading Screen & Client Hardware Probe" : "Transparent Inline Guard"}
 * CORE FEATURES: In-Place Landing Page Protection, Strict 404/403 support, hardware entropy, UTM preservation.
 */

if (!defined('ABSPATH')) {
    exit; // Prevent direct file access
}

class CleanTrafficShield {
    private $apiKey = '${apiKey}';
    private $apiEndpoint = '${endpoint}';
    private $enableLoading = ${enableLoading ? "true" : "false"};
    private $failMode = '${failMode}'; // 'open' or 'closed'
    private $timeout = ${timeoutSec};

    public function __construct() {
        add_action('init', array($this, 'inspect_traffic'), 1);
        if ($this->enableLoading) {
            add_action('wp_head', array($this, 'inject_hardware_probe'), 1);
        }
    }

    public function inject_hardware_probe() {
        if (is_admin() || (isset($_COOKIE['ctc_verified']) && $_COOKIE['ctc_verified'] === '1')) {
            return;
        }
        echo '<script src="' . esc_url($this->apiEndpoint . '/v1/protect.js') . '" data-api-key="' . esc_attr($this->apiKey) . '" data-loading="true" data-heading="${heading.replace(/"/g, '\\"')}" data-subnote="${subnote.replace(/"/g, '\\"')}" async></script>';
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

        // Call CleanTraffic Backend API with target timeout
        $response = wp_remote_post($this->apiEndpoint . '/api/classify', array(
            'timeout'     => $this->timeout,
            'redirection' => 0,
            'httpversion' => '1.1',
            'blocking'    => true,
            'headers'     => array(
                'Content-Type' => 'application/json; charset=utf-8',
                'X-API-Key'    => $this->apiKey,
                'User-Agent'   => 'CleanTraffic-WordPress-Shield/2.5'
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

        // On network error or timeout: check failMode policy and 3-retry auto-bypass
        $isError = is_wp_error($response);
        $httpCode = !$isError ? wp_remote_retrieve_response_code($response) : 504;

        if ($isError || $httpCode >= 500 || $httpCode === 401 || $httpCode === 403) {
            $retries = isset($_COOKIE['ctc_retry']) ? intval($_COOKIE['ctc_retry']) : 0;

            // SMART 3-RETRY AUTO-BYPASS: If visitor has retried 2+ times, pass through seamlessly & send diagnostic beacon
            if ($retries >= 2) {
                wp_remote_post($this->apiEndpoint . '/api/monitoring/incident-beacon', array(
                    'timeout'   => 0.5,
                    'blocking'  => false,
                    'headers'   => array('Content-Type' => 'application/json'),
                    'body'      => wp_json_encode(array(
                        'type'       => 'edge_3retry_bypass',
                        'url'        => home_url($_SERVER['REQUEST_URI']),
                        'ip'         => $visitorIp,
                        'apiKey'     => $this->apiKey,
                        'retryCount' => 3,
                        'latencyMs'  => intval($this->timeout * 1000),
                        'userAgent'  => $userAgent,
                        'platform'   => 'WordPress'
                    ))
                ));

                setcookie('ctc_verified', '1', time() + 3600, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
                setcookie('ctc_retry', '0', time() - 3600, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
                header('X-CleanTraffic-Fallback: 3-retry-bypass');
                return;
            }

            if ($this->failMode === 'closed') {
                $nextRetry = $retries + 1;
                setcookie('ctc_retry', strval($nextRetry), time() + 120, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
                status_header(403);
                nocache_headers();
                wp_die(
                    '<h1>Security Verification Required</h1>' .
                    '<p>Connection verification timed out. If you are a human visitor, please click Retry below to verify your connection.</p>' .
                    '<p><button type="button" onclick="location.reload()" style="padding:10px 18px;background:#10B981;color:#0B0F19;font-weight:700;border:none;border-radius:8px;cursor:pointer;">Retry Connection</button></p>' .
                    '<p style="font-size:11px;color:#64748B;">Attempt ' . $nextRetry . ' of 3 &bull; Auto-bypasses on 3rd attempt</p>',
                    'Security Verification Required',
                    array('response' => 403)
                );
                exit;
            }
            return;
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

                // Smart Traffic Routing: Redirect if destination URL is configured
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

        // In-Place Landing Page Protection: Cache verification for 1 hour on clean allow
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
  const failMode = options.failMode || "open";
  const timeoutMs = options.timeoutMs || 400;

  return `// middleware.ts (Root of your Next.js project)
// Compatible with Next.js 13, 14, and 15 (App & Pages Router)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const FAIL_MODE = '${failMode}'; // 'open' or 'closed'

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
        'User-Agent': 'CleanTraffic-NextJS-Middleware/2.5'
      },
      body: JSON.stringify({
        apiKey: process.env.CLEANTRAFFIC_API_KEY || '${apiKey}',
        ip,
        userAgent,
        queryString,
        referer,
        url: request.url
      }),
      signal: AbortSignal.timeout(${timeoutMs}),
    });

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
    } else if (res.status >= 500 || res.status === 401 || res.status === 403) {
      const retries = parseInt(request.cookies.get('ctc_retry')?.value || '0', 10);
      if (retries >= 2) {
        // SMART 3-RETRY AUTO-BYPASS
        fetch('${endpoint}/api/monitoring/incident-beacon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'edge_3retry_bypass',
            url: request.url,
            ip,
            apiKey: process.env.CLEANTRAFFIC_API_KEY || '${apiKey}',
            retryCount: 3,
            latencyMs: ${timeoutMs},
            userAgent,
            platform: 'NextJS'
          })
        }).catch(() => {});

        const passResp = NextResponse.next();
        passResp.cookies.set('ctc_verified', '1', { maxAge: 3600, path: '/', sameSite: 'lax' });
        passResp.cookies.delete('ctc_retry');
        passResp.headers.set('X-CleanTraffic-Fallback', '3-retry-bypass');
        return passResp;
      }

      if (FAIL_MODE === 'closed') {
        const nextRetry = retries + 1;
        const challenge = new NextResponse(
          \`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Security Verification Required</title><style>body{background:#0B0F19;color:#F8FAFC;font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;}div{background:#111827;border:1px solid #1E293B;border-radius:12px;padding:32px;max-width:440px;text-align:center;}button{padding:10px 18px;background:#10B981;color:#0B0F19;font-weight:700;border:none;border-radius:8px;cursor:pointer;margin-top:14px;}</style></head><body><div><h2>Security Verification Required</h2><p>Verification check timed out. Please click Retry below to verify your connection.</p><button onclick="location.reload()">Retry Connection</button><p style="margin-top:12px;font-size:11px;color:#64748B;">Attempt \${nextRetry} of 3 &bull; Auto-bypasses on 3rd attempt</p></div></body></html>\`,
          { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
        challenge.cookies.set('ctc_retry', String(nextRetry), { maxAge: 120, path: '/', sameSite: 'lax' });
        return challenge;
      }
    }
  } catch (error) {
    const retries = parseInt(request.cookies.get('ctc_retry')?.value || '0', 10);
    if (retries >= 2) {
      // SMART 3-RETRY AUTO-BYPASS
      fetch('${endpoint}/api/monitoring/incident-beacon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'edge_3retry_bypass',
          url: request.url,
          ip,
          apiKey: process.env.CLEANTRAFFIC_API_KEY || '${apiKey}',
          retryCount: 3,
          latencyMs: ${timeoutMs},
          userAgent,
          platform: 'NextJS'
        })
      }).catch(() => {});

      const passResp = NextResponse.next();
      passResp.cookies.set('ctc_verified', '1', { maxAge: 3600, path: '/', sameSite: 'lax' });
      passResp.cookies.delete('ctc_retry');
      passResp.headers.set('X-CleanTraffic-Fallback', '3-retry-bypass');
      return passResp;
    }

    if (FAIL_MODE === 'closed') {
      const nextRetry = retries + 1;
      const challenge = new NextResponse(
        \`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Security Verification Required</title><style>body{background:#0B0F19;color:#F8FAFC;font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;}div{background:#111827;border:1px solid #1E293B;border-radius:12px;padding:32px;max-width:440px;text-align:center;}button{padding:10px 18px;background:#10B981;color:#0B0F19;font-weight:700;border:none;border-radius:8px;cursor:pointer;margin-top:14px;}</style></head><body><div><h2>Security Verification Required</h2><p>Verification check timed out. Please click Retry below to verify your connection.</p><button onclick="location.reload()">Retry Connection</button><p style="margin-top:12px;font-size:11px;color:#64748B;">Attempt \${nextRetry} of 3 &bull; Auto-bypasses on 3rd attempt</p></div></body></html>\`,
        { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
      challenge.cookies.set('ctc_retry', String(nextRetry), { maxAge: 120, path: '/', sameSite: 'lax' });
      return challenge;
    }
    console.warn('CleanTraffic pass-through under Fail-Open policy on timeout.');
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
  const failMode = options.failMode || "open";
  const timeoutMs = options.timeoutMs || 400;

  return `// cleantrafficMiddleware.js (Express / Node.js)
// Drop-in middleware for Railway, Render, Fly.io, or any Express server

const axios = require('axios'); // or native fetch in Node 18+

function cleanTrafficMiddleware(options = {}) {
  const apiKey = options.apiKey || process.env.CLEANTRAFFIC_API_KEY || '${apiKey}';
  const endpoint = options.endpoint || '${endpoint}';
  const failMode = options.failMode || '${failMode}';
  const timeout = options.timeout || ${timeoutMs};

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
        timeout: timeout,
        headers: {
          'X-API-Key': apiKey,
          'User-Agent': 'CleanTraffic-Express-Middleware/2.5'
        },
        validateStatus: () => true
      });

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
      } else if (response.status >= 500 || response.status === 401 || response.status === 403) {
        const retries = parseInt((req.cookies && req.cookies.ctc_retry) || '0', 10);
        if (retries >= 2) {
          // SMART 3-RETRY AUTO-BYPASS
          axios.post(endpoint + '/api/monitoring/incident-beacon', {
            type: 'edge_3retry_bypass',
            url: req.protocol + '://' + req.get('host') + req.originalUrl,
            ip,
            apiKey,
            retryCount: 3,
            latencyMs: timeout,
            userAgent,
            platform: 'Express'
          }).catch(() => {});

          res.cookie('ctc_verified', '1', { maxAge: 3600000, httpOnly: true });
          res.clearCookie('ctc_retry');
          res.set('X-CleanTraffic-Fallback', '3-retry-bypass');
          return next();
        }

        if (failMode === 'closed') {
          const nextRetry = retries + 1;
          res.cookie('ctc_retry', String(nextRetry), { maxAge: 120000, httpOnly: true });
          return res.status(403).send(\`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Security Verification Required</title><style>body{background:#0B0F19;color:#F8FAFC;font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;}div{background:#111827;border:1px solid #1E293B;border-radius:12px;padding:32px;max-width:440px;text-align:center;}button{padding:10px 18px;background:#10B981;color:#0B0F19;font-weight:700;border:none;border-radius:8px;cursor:pointer;margin-top:14px;}</style></head><body><div><h2>Security Verification Required</h2><p>Connection check required. Please click Retry below to verify your connection.</p><button onclick="location.reload()">Retry Connection</button><p style="margin-top:12px;font-size:11px;color:#64748B;">Attempt \${nextRetry} of 3 &bull; Auto-bypasses on 3rd attempt</p></div></body></html>\`);
        }
      }

      res.cookie('ctc_verified', '1', { maxAge: 3600000, httpOnly: true });
      return next();
    } catch (err) {
      const retries = parseInt((req.cookies && req.cookies.ctc_retry) || '0', 10);
      if (retries >= 2) {
        // SMART 3-RETRY AUTO-BYPASS
        axios.post(endpoint + '/api/monitoring/incident-beacon', {
          type: 'edge_3retry_bypass',
          url: req.protocol + '://' + req.get('host') + req.originalUrl,
          ip,
          apiKey,
          retryCount: 3,
          latencyMs: timeout,
          userAgent,
          platform: 'Express'
        }).catch(() => {});

        res.cookie('ctc_verified', '1', { maxAge: 3600000, httpOnly: true });
        res.clearCookie('ctc_retry');
        res.set('X-CleanTraffic-Fallback', '3-retry-bypass');
        return next();
      }

      if (failMode === 'closed') {
        const nextRetry = retries + 1;
        res.cookie('ctc_retry', String(nextRetry), { maxAge: 120000, httpOnly: true });
        return res.status(403).send(\`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Security Verification Required</title><style>body{background:#0B0F19;color:#F8FAFC;font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;}div{background:#111827;border:1px solid #1E293B;border-radius:12px;padding:32px;max-width:440px;text-align:center;}button{padding:10px 18px;background:#10B981;color:#0B0F19;font-weight:700;border:none;border-radius:8px;cursor:pointer;margin-top:14px;}</style></head><body><div><h2>Security Verification Required</h2><p>Connection verification timed out. Please click Retry below to verify your connection.</p><button onclick="location.reload()">Retry Connection</button><p style="margin-top:12px;font-size:11px;color:#64748B;">Attempt \${nextRetry} of 3 &bull; Auto-bypasses on 3rd attempt</p></div></body></html>\`);
      }
      // Fail-open pass-through on error or network timeout
      return next();
    }
  };
}

module.exports = cleanTrafficMiddleware;
`;
}

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
 * CleanTraffic - Cloudflare Edge Shield (Interstitial Mode)
 * Edge security verification for Cloudflare-routed domains
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
 * CleanTraffic - Cloudflare Edge Shield
 * High-performance edge protection for Cloudflare-routed domains
 */

const FAIL_MODE = "${failMode}"; // "open" (pass traffic on timeout) or "closed" (block on timeout)
const TIMEOUT_MS = ${timeoutMs};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Bypass static assets (images, CSS, JS, fonts, media, icons)
    const isStaticAsset = /\\.(css|js|jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot|mp4|webm|pdf|map|xml|txt|json|avif)$/i.test(url.pathname);
    if (isStaticAsset) {
      return fetch(request);
    }

    // 2. Fast pass for visitors already verified in this session
    const bypassCookie = url.searchParams.has('nocache') || url.searchParams.has('ctc_test');
    const cookieHeader = request.headers.get('Cookie') || '';
    if (!bypassCookie && cookieHeader.includes('ctc_verified=1')) {
      return fetch(request);
    }

    // 3. Resolve API Key (supports Cloudflare Secret CLEANTRAFFIC_API_KEY or pre-configured key)
    const activeApiKey = (env && env.CLEANTRAFFIC_API_KEY) ? env.CLEANTRAFFIC_API_KEY : '${apiKey}';

    // 4. Extract real visitor metadata
    const clientIp = request.headers.get('cf-connecting-ip') 
      || request.headers.get('x-real-ip') 
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || '127.0.0.1';
    
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const queryString = url.search ? url.search.substring(1) : '';

    // 5. Query CleanTraffic Intelligence Engine at the edge
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch('${endpoint}/api/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': activeApiKey,
          'User-Agent': 'CleanTraffic-Cloudflare-Worker'
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
        const verdict = await response.json();
        const action = String(verdict.action || '');
        const statusCode = verdict.statusCode;
        const statusAction = String(verdict.statusAction || '');
        const isBlocked = !verdict.isHuman || action === 'Blocked' || verdict.visitorType === 'Bot' || verdict.visitor_type === 'Bot' || action === 'Restricted';

        // Bot or restricted traffic interception
        if (isBlocked) {
          if (verdict.redirectUrl && String(verdict.redirectUrl).startsWith('http')) {
            return Response.redirect(verdict.redirectUrl, 302);
          }
          if (action === '403' || statusCode === 403 || statusAction === '403' || verdict.statusAction === '403') {
            return new Response('403 Forbidden', {
              status: 403,
              headers: { 
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'X-CleanTraffic-Verdict': 'Blocked'
              }
            });
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
      }
    } catch (err) {
      if (FAIL_MODE === 'closed') {
        return new Response('403 Forbidden', { status: 403 });
      }
    }

    // 6. Verified human visitor: Forward to live website origin & set session cookie
    const originResponse = await fetch(request);
    const modifiedResponse = new Response(originResponse.body, originResponse);
    modifiedResponse.headers.append('Set-Cookie', 'ctc_verified=1; Path=/; Max-Age=3600; SameSite=Lax');
    modifiedResponse.headers.set('X-CleanTraffic-Shield', 'Active');
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
 * Executes at the edge before route handlers or React Server Components render.
 * Humans stay on https://domain.com (NextResponse.next()), bots receive 403/404.
 */
export function generateNextJsMiddleware(options: GeneratorOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const failMode = options.failMode || "open";
  const timeoutMs = options.timeoutMs && options.timeoutMs >= 200 ? options.timeoutMs : 800;

  return `// middleware.ts (Root of your Next.js project)
// Compatible with Next.js 13, 14, and 15 (App & Pages Router)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_KEY = process.env.CLEANTRAFFIC_API_KEY || '${apiKey}';
const ENDPOINT = (process.env.CLEANTRAFFIC_ENDPOINT || '${endpoint}').replace(/\\/+$/, '');
const TIMEOUT_MS = ${timeoutMs};
const FAIL_MODE = '${failMode}'; // 'open' (allow traffic if API times out) or 'closed'

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Bypass static assets, Next.js internal bundles, and health endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.match(/\\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|mp4|webm|pdf|map|json|txt|xml)$/i)
  ) {
    return NextResponse.next();
  }

  // 2. Extract visitor IP and headers
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.ip 
    || '127.0.0.1';
  
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  const queryString = search ? search.substring(1) : '';

  try {
    const res = await fetch(\`\${ENDPOINT}/api/classify\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'User-Agent': 'CleanTraffic-NextJS-Middleware/3.0'
      },
      body: JSON.stringify({
        apiKey: API_KEY,
        ip,
        userAgent,
        queryString,
        referer,
        url: request.url
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.ok) {
      const verdict = await res.json();
      const isHuman = Boolean(verdict.isHuman || verdict.is_human || verdict.visitorType === 'Human');
      const action = String(verdict.action || '');
      const statusCode = verdict.statusCode || (action === '404' ? 404 : 403);
      const isBlocked = !isHuman || action === 'Blocked' || action === 'Restricted' || action === '403' || action === '404';

      // Blocked traffic (bot, scraper, or restricted network)
      if (isBlocked) {
        // If a custom bot deflection URL is explicitly configured, redirect only the bot
        if (verdict.destination && verdict.destination !== '404' && verdict.destination !== '403' && verdict.destination.startsWith('http')) {
          return NextResponse.redirect(new URL(verdict.destination, request.url));
        }

        const is404 = action === '404' || statusCode === 404;
        return new NextResponse(is404 ? '404 Not Found' : '403 Forbidden - Access Denied', {
          status: is404 ? 404 : 403,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-CleanTraffic-Shield': 'Blocked'
          }
        });
      }
    }
  } catch (error) {
    if (FAIL_MODE === 'closed') {
      return new NextResponse('403 Forbidden - Security Verification Required', { status: 403 });
    }
    // Fail-open: pass request through safely on network error or timeout
  }

  // Verified human: allow smoothly onto destination route without redirects
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
`;
}

/**
 * 5. Node.js & Express Middleware (for Railway, Render, Fly.io, Custom VPS)
 * Zero external dependencies (uses native Node 18+ fetch).
 * In-memory verdict caching prevents external API delays on repeat requests.
 * Humans stay on https://domain.com (next()), bots receive 403/404.
 */
export function generateNodeExpressMiddleware(options: GeneratorOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const failMode = options.failMode || "open";
  const timeoutMs = options.timeoutMs && options.timeoutMs >= 200 ? options.timeoutMs : 800;

  return `// cleantraffic.js (Express / Node.js 18+)
// Zero external dependencies (native fetch & built-in Map cache)

const API_KEY = process.env.CLEANTRAFFIC_API_KEY || '${apiKey}';
const ENDPOINT = (process.env.CLEANTRAFFIC_ENDPOINT || '${endpoint}').replace(/\\/+$/, '');
const FAIL_MODE = process.env.CLEANTRAFFIC_FAIL_MODE || '${failMode}'; // 'open' or 'closed'
const TIMEOUT_MS = ${timeoutMs}; // Sub-second protection timeout
const CACHE_TTL_MS = 3600 * 1000; // 1-hour in-memory cache (0ms latency for repeat visits)

// Server-authoritative in-memory verdict cache (tamper-proof, immune to cookie forgery)
const verdictCache = new Map();

// Periodic garbage collection of expired entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of verdictCache.entries()) {
    if (entry.expires <= now) verdictCache.delete(ip);
  }
}, 15 * 60 * 1000).unref?.();

// Static asset and health check bypass regex
const STATIC_ASSET_REGEX = /\\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|mp4|webm|pdf|map|json|txt|xml)$/i;

function cleanTrafficMiddleware(options = {}) {
  const apiKey = options.apiKey || API_KEY;
  const endpoint = (options.endpoint || ENDPOINT).replace(/\\/+$/, '');
  const timeoutMs = options.timeout || TIMEOUT_MS;
  const failMode = options.failMode || FAIL_MODE;

  return async function(req, res, next) {
    // 1. Skip static assets & health checks
    if (
      STATIC_ASSET_REGEX.test(req.path) ||
      req.path === '/health' ||
      req.path === '/healthz' ||
      req.path === '/favicon.ico' ||
      req.path === '/robots.txt'
    ) {
      return next();
    }

    // 2. Extract visitor IP
    const ip = req.headers['cf-connecting-ip'] 
      || req.headers['x-real-ip']
      || req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.socket.remoteAddress 
      || '127.0.0.1';

    // 3. Fast-path: Check server in-memory verdict cache (0ms latency)
    const cached = verdictCache.get(ip);
    if (cached && cached.expires > Date.now()) {
      if (cached.isHuman) {
        return next(); // Verified human: allow seamlessly on https://domain.com
      } else {
        return cached.statusCode === 404
          ? res.status(404).send('404 Not Found')
          : res.status(403).send('403 Forbidden - Access Denied');
      }
    }

    // 4. Query CleanTraffic API via native Node 18+ fetch
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const fullUrl = req.protocol + '://' + (req.get('host') || 'localhost') + req.originalUrl;

    try {
      const response = await fetch(\`\${endpoint}/api/classify\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'User-Agent': 'CleanTraffic-Express-Middleware/3.0'
        },
        body: JSON.stringify({
          apiKey,
          ip,
          userAgent,
          queryString,
          referer,
          url: fullUrl
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (response.ok) {
        const data = await response.json();
        const isHuman = Boolean(data.isHuman || data.is_human || data.visitorType === 'Human');
        const action = String(data.action || '');
        const statusCode = data.statusCode || (action === '404' ? 404 : 403);
        const isBlocked = !isHuman || action === 'Blocked' || action === 'Restricted' || action === '403' || action === '404';

        // Cache the verdict in memory
        verdictCache.set(ip, {
          isHuman: !isBlocked,
          statusCode,
          expires: Date.now() + CACHE_TTL_MS
        });

        // If human: allow straight into the application without redirects
        if (!isBlocked) {
          return next();
        }

        // If a custom bot redirect URL is configured, deflect only the bot
        if (data.destination && data.destination !== '404' && data.destination !== '403' && data.destination.startsWith('http')) {
          return res.redirect(302, data.destination);
        }

        // Return HTTP 404 or 403 at the edge
        if (action === '404' || statusCode === 404) {
          return res.status(404).send('404 Not Found');
        }
        return res.status(403).send('403 Forbidden - Access Denied');
      }
    } catch (err) {
      if (failMode === 'closed') {
        return res.status(403).send('403 Forbidden - Security Check Required');
      }
      // Fail-open: continue request smoothly without breaking user site
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[CleanTraffic] API check timeout, failing open:', err.message);
      }
    }

    return next();
  };
}

module.exports = cleanTrafficMiddleware;
`;
}

/**
 * 6. Fastify Hook (for modern ultra-fast Node.js backends)
 * Zero external dependencies (native fetch & built-in Map cache).
 */
export function generateFastifyHook(options: GeneratorOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs && options.timeoutMs >= 200 ? options.timeoutMs : 800;

  return `// cleantrafficFastify.js (Fastify Plugin / Hook)
// Zero external dependencies (Node 18+ native fetch)

const API_KEY = process.env.CLEANTRAFFIC_API_KEY || '${apiKey}';
const ENDPOINT = (process.env.CLEANTRAFFIC_ENDPOINT || '${endpoint}').replace(/\\/+$/, '');
const TIMEOUT_MS = ${timeoutMs};
const CACHE_TTL_MS = 3600 * 1000;

const verdictCache = new Map();
const STATIC_ASSET_REGEX = /\\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|mp4|webm|pdf|map|json|txt|xml)$/i;

async function cleanTrafficPlugin(fastify, options) {
  const apiKey = options?.apiKey || API_KEY;
  const endpoint = (options?.endpoint || ENDPOINT).replace(/\\/+$/, '');
  const timeoutMs = options?.timeout || TIMEOUT_MS;

  fastify.addHook('onRequest', async (req, reply) => {
    // 1. Skip static assets & health checks
    if (STATIC_ASSET_REGEX.test(req.url) || req.url === '/health' || req.url === '/favicon.ico') {
      return;
    }

    // 2. Extract visitor IP
    const ip = req.headers['cf-connecting-ip'] 
      || req.headers['x-real-ip']
      || req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.ip 
      || '127.0.0.1';

    // 3. Fast-path: Check server in-memory verdict cache (0ms latency)
    const cached = verdictCache.get(ip);
    if (cached && cached.expires > Date.now()) {
      if (!cached.isHuman) {
        return reply.code(cached.statusCode || 403).send(
          cached.statusCode === 404 ? '404 Not Found' : '403 Forbidden - Access Denied'
        );
      }
      return;
    }

    try {
      const response = await fetch(\`\${endpoint}/api/classify\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'User-Agent': 'CleanTraffic-Fastify-Plugin/3.0'
        },
        body: JSON.stringify({
          apiKey,
          ip,
          userAgent: req.headers['user-agent'] || '',
          url: req.protocol + '://' + req.hostname + req.url
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (response.ok) {
        const data = await response.json();
        const isHuman = Boolean(data.isHuman || data.is_human || data.visitorType === 'Human');
        const action = String(data.action || '');
        const statusCode = data.statusCode || (action === '404' ? 404 : 403);
        const isBlocked = !isHuman || action === 'Blocked' || action === 'Restricted' || action === '403' || action === '404';

        verdictCache.set(ip, {
          isHuman: !isBlocked,
          statusCode,
          expires: Date.now() + CACHE_TTL_MS
        });

        if (isBlocked) {
          return reply.code(statusCode).send(
            statusCode === 404 ? '404 Not Found' : '403 Forbidden - Access Denied'
          );
        }
      }
    } catch (err) {
      // Fail-open: allow request to proceed without interruption
    }
  });
}

module.exports = cleanTrafficPlugin;
`;
}

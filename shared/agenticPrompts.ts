/**
 * Agentic AI Integration Prompts for CleanTraffic
 * Formatted specifically for LLM Coding Agents (Cursor, Windsurf, Claude Code, GitHub Copilot, ChatGPT)
 * Modeled after modern DevSecOps standards (Fingerprint.com style).
 * 
 * 100% SELF-CONTAINED:
 * Users DO NOT need to download or attach any files!
 * The complete, zero-dependency source code is embedded directly inside the prompt.
 * 
 * REAL-TIME ENFORCEMENT:
 * - Queries CleanTraffic Cloud Rules in real-time (~10-15ms).
 * - Enforces both Bots ('Blocked') AND Dashboard Policy Rules ('Restricted', e.g. PC blocked, Geo-fencing).
 * - Dynamically supports configurable Deflection (403 Forbidden, 404 Stealth Drop, or Redirect to Bot URL).
 */

export interface AgentPromptOptions {
  apiKeyValue?: string;
  effectiveEndpoint: string;
  targetStack?: "nextjs" | "nodejs" | "cloudflare" | "php" | "wordpress" | "shopify" | "universal";
  deflectionAction?: "403" | "404" | "redirect";
  botFallbackUrl?: string;
  failMode?: string;
  timeoutMs?: number;
}

function getDeflectionDescription(deflectionAction: "403" | "404" | "redirect", botFallbackUrl?: string): string {
  if (deflectionAction === "redirect" && botFallbackUrl) {
    return `Redirect to Bot Fallback URL (${botFallbackUrl})`;
  }
  if (deflectionAction === "404") {
    return "HTTP 404 Not Found (Stealth drop - mimics non-existent route to confuse scrapers)";
  }
  return "HTTP 403 Forbidden - Access Denied (Authentic edge cut-off)";
}

export const generateUniversalAgentPrompt = generateNextJsAgentPrompt;

export function generateNextJsAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const deflectionAction = options.deflectionAction || "403";
  const botFallbackUrl = options.botFallbackUrl?.trim() || "";
  const timeoutMs = options.timeoutMs && options.timeoutMs >= 200 ? options.timeoutMs : 800;

  const deflectionSnippet = deflectionAction === "redirect" && botFallbackUrl
    ? `return NextResponse.redirect(new URL('${botFallbackUrl}', request.url));`
    : deflectionAction === "404"
    ? `return new NextResponse('404 Not Found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-CleanTraffic-Shield': 'Deflected-404' }
        });`
    : `return new NextResponse('403 Forbidden - Access Denied', {
          status: 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-CleanTraffic-Shield': 'Deflected-403' }
        });`;

  return `# Add CleanTraffic Edge Middleware to Next.js

Set up CleanTraffic in this Next.js project (App Router or Pages Router) to filter automated bots, scrapers, and ad fraud at the Vercel Edge compute layer before rendering.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Classification Endpoint: ${endpoint}/api/classify
- Deflection Action: ${getDeflectionDescription(deflectionAction, botFallbackUrl)}
- Timeout: ${timeoutMs}ms (Fail-Open guarantee)

## Step 1: Create or Replace middleware.ts
In the root directory of the Next.js project (or inside \`src/\` if using the src directory convention), create \`middleware.ts\`:

\`\`\`typescript
// middleware.ts (CleanTraffic Edge Guard for Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_KEY = process.env.CLEANTRAFFIC_API_KEY || '${apiKey}';
const ENDPOINT = '${endpoint}';
const TIMEOUT_MS = ${timeoutMs};

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Bypass static assets, Next internals, and health checks immediately
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname.match(/\\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|mp4|webm|pdf|map|json|txt|xml)$/i)
  ) {
    return NextResponse.next();
  }

  // 2. Extract client IP safely from proxy headers
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.ip 
    || '127.0.0.1';

  try {
    // 3. Real-time classification against your CleanTraffic Cloud Rules
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
        userAgent: request.headers.get('user-agent') || '',
        queryString: search ? search.substring(1) : '',
        referer: request.headers.get('referer') || '',
        url: request.url,
        stack: 'nextjs'
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.ok) {
      const verdict = await res.json();
      
      // 4. Catches BOTH bots ('Blocked') AND Dashboard Policy Rules ('Restricted', e.g. PC blocked, Geo-fencing)
      const isBlocked = !verdict.isHuman 
        || verdict.action === 'Blocked' 
        || verdict.action === 'Restricted';

      if (isBlocked) {
        ${deflectionSnippet}
      }
    }
  } catch (error) {
    // Fail-open: If network hiccups, legitimate traffic is never blocked
  }

  // 5. Legitimate human visitors continue to page route with zero redirects
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
\`\`\`

## Step 2: Verify Edge Execution
1. Run \`npm run dev\`.
2. Open \`http://localhost:3000\` in your browser -> Page loads normally (HTTP 200).
3. In a terminal, test automated bot rejection:
   \`curl -i -A "Googlebot" http://localhost:3000/\`
   Confirm the request receives the configured deflection (${deflectionAction === '404' ? 'HTTP 404' : deflectionAction === 'redirect' ? 'HTTP 302' : 'HTTP 403'}).
4. Check the CleanTraffic Live Feed dashboard (${endpoint}/dashboard?tab=traffic) to verify real-time event telemetry.
`;
}

export function generateExpressAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const deflectionAction = options.deflectionAction || "403";
  const botFallbackUrl = options.botFallbackUrl?.trim() || "";
  const timeoutMs = options.timeoutMs && options.timeoutMs >= 200 ? options.timeoutMs : 800;

  const deflectionSnippet = deflectionAction === "redirect" && botFallbackUrl
    ? `return res.redirect('${botFallbackUrl}');`
    : deflectionAction === "404"
    ? `return res.status(404).send('404 Not Found');`
    : `return res.status(403).send('403 Forbidden - Access Denied');`;

  return `# Add CleanTraffic Middleware to Express.js / Node.js

Set up CleanTraffic in this Express.js application to screen traffic against automated scrapers and cloud security policies (Device filtering, Geo-fencing, Click Fraud) with zero external npm dependencies.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Classification Endpoint: ${endpoint}/api/classify
- Deflection Action: ${getDeflectionDescription(deflectionAction, botFallbackUrl)}
- Timeout: ${timeoutMs}ms (Fail-Open)

## Step 1: Create the Middleware File
Create \`middleware/cleantraffic.js\` (or \`src/middleware/cleantraffic.js\`):

\`\`\`javascript
// middleware/cleantraffic.js (Native Node 18+ Zero-Dependency Shield)
const API_KEY = process.env.CLEANTRAFFIC_API_KEY || '${apiKey}';
const ENDPOINT = '${endpoint}';
const TIMEOUT_MS = ${timeoutMs};

const STATIC_ASSET_REGEX = /\\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|mp4|webm|pdf|map|json|txt|xml)$/i;

function cleanTrafficMiddleware() {
  return async function(req, res, next) {
    // 1. Skip static assets, health checks, and favicon
    if (STATIC_ASSET_REGEX.test(req.path) || req.path === '/health' || req.path === '/favicon.ico') {
      return next();
    }

    const ip = req.headers['cf-connecting-ip'] 
      || req.headers['x-real-ip']
      || req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.socket.remoteAddress 
      || '127.0.0.1';

    try {
      // 2. Real-time classification against your CleanTraffic Cloud Rules
      const response = await fetch(\`\${ENDPOINT}/api/classify\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'User-Agent': 'CleanTraffic-Express-Middleware/3.0'
        },
        body: JSON.stringify({
          apiKey: API_KEY,
          ip,
          userAgent: req.headers['user-agent'] || '',
          queryString: req.url.includes('?') ? req.url.split('?')[1] : '',
          url: req.protocol + '://' + (req.get('host') || 'localhost') + req.originalUrl,
          stack: 'express'
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });

      if (response.ok) {
        const data = await response.json();

        // 3. Catches BOTH bots ('Blocked') AND Dashboard Policy Rules ('Restricted', e.g. PC blocked, Geo-fencing)
        const isBlocked = !data.isHuman 
          || data.action === 'Blocked' 
          || data.action === 'Restricted';

        if (isBlocked) {
          ${deflectionSnippet}
        }
      }
    } catch (err) {
      // Fail-open: guarantee site uptime if network fluctuates
    }

    // 4. Real humans proceed directly with 0ms delay
    return next();
  };
}

module.exports = cleanTrafficMiddleware;
\`\`\`

## Step 2: Register in Express App
In your entry file (\`app.js\`, \`server.js\`, or \`src/index.ts\`):
\`\`\`javascript
const cleanTraffic = require('./middleware/cleantraffic');
app.use(cleanTraffic()); // Zero external npm dependencies
\`\`\`

## Step 3: Test and Verify
1. Start server: \`npm start\` or \`npm run dev\`.
2. Visit in browser -> HTTP 200 (human allowed).
3. Test bot rejection in terminal:
   \`curl -i -A "Scrapy/2.5" http://localhost:3000/\`
   Confirm the response is deflected as configured (${deflectionAction === '404' ? 'HTTP 404' : deflectionAction === 'redirect' ? 'HTTP 302' : 'HTTP 403'}).
`;
}

export function generateCloudflareAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const deflectionAction = options.deflectionAction || "403";
  const botFallbackUrl = options.botFallbackUrl?.trim() || "";

  const deflectionSnippet = deflectionAction === "redirect" && botFallbackUrl
    ? `return Response.redirect('${botFallbackUrl}', 302);`
    : deflectionAction === "404"
    ? `return new Response('404 Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });`
    : `return new Response('403 Forbidden - Access Denied', { status: 403, headers: { 'Content-Type': 'text/plain' } });`;

  return `# Deploy CleanTraffic Cloudflare Edge Worker

Deploy CleanTraffic as a Cloudflare Edge Worker to screen incoming traffic across Cloudflare's 300+ Edge POPs before requests touch your origin server.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Classification Endpoint: ${endpoint}/api/classify
- Deflection Action: ${getDeflectionDescription(deflectionAction, botFallbackUrl)}

## Step 1: Detect Wrangler or Cloudflare Setup
Check if the project uses Wrangler (\`wrangler.toml\` or \`wrangler.jsonc\`). If not, initialize one with \`npx wrangler init\`.

## Step 2: Implement the Worker Handler
Create or update \`src/index.js\` (or \`src/index.ts\`):
\`\`\`javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Bypass static assets & health check
    if (url.pathname.match(/\\.(css|js|png|jpg|svg|ico|webp|woff2)$/i) || url.pathname === '/health') {
      return fetch(request);
    }

    const apiKey = env.CLEANTRAFFIC_API_KEY || '${apiKey}';
    const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';

    try {
      // 2. Real-time classification query
      const checkResp = await fetch('${endpoint}/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          apiKey,
          ip,
          userAgent: request.headers.get('user-agent') || '',
          url: request.url,
          stack: 'cloudflare'
        }),
        signal: AbortSignal.timeout(800)
      });

      if (checkResp.ok) {
        const verdict = await checkResp.json();
        const isBlocked = !verdict.isHuman 
          || verdict.action === 'Blocked' 
          || verdict.action === 'Restricted';

        if (isBlocked) {
          ${deflectionSnippet}
        }
      }
    } catch (e) {
      // Fail-open
    }

    // 3. Human traffic forwarded to origin without any redirects
    return fetch(request);
  }
};
\`\`\`

Set Cloudflare secret:
\`npx wrangler secret put CLEANTRAFFIC_API_KEY\` with value \`${apiKey}\`.

## Step 3: Deploy & Route
Deploy via \`npx wrangler deploy\` and map the route to \`*yourdomain.com/*\` in the Cloudflare Dashboard.
`;
}

export function generatePhpAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const deflectionAction = options.deflectionAction || "403";
  const botFallbackUrl = options.botFallbackUrl?.trim() || "";

  const deflectionSnippet = deflectionAction === "redirect" && botFallbackUrl
    ? `header("Location: ${botFallbackUrl}", true, 302);
        exit;`
    : deflectionAction === "404"
    ? `http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo "404 Not Found";
        exit;`
    : `http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo "403 Forbidden - Access Denied";
        exit;`;

  return `# Add CleanTraffic Protection to PHP / Apache / Nginx

Integrate CleanTraffic into this PHP application, WordPress installation, or campaign landing page root to screen visitors using server-side cURL before rendering HTML.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Classification Endpoint: ${endpoint}/api/classify
- Deflection Action: ${getDeflectionDescription(deflectionAction, botFallbackUrl)}

## Step 1: Place the PHP Shield
In the root directory of your website (e.g. \`index.php\` or \`prepend.php\`):

\`\`\`php
<?php
// CleanTraffic Verification Guard (PHP 7.4+ with cURL)
$apiKey = getenv('CLEANTRAFFIC_API_KEY') ?: '${apiKey}';
$endpoint = '${endpoint}';

$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] 
    ?? $_SERVER['HTTP_X_REAL_IP'] 
    ?? explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')[0] 
    ?? $_SERVER['REMOTE_ADDR'] 
    ?? '127.0.0.1';

$ch = curl_init("$endpoint/api/classify");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT_MS => 1200,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', "X-API-Key: $apiKey"],
    CURLOPT_POSTFIELDS => json_encode([
        'apiKey' => $apiKey,
        'ip' => trim($ip),
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'url' => (isset($_SERVER['HTTPS']) ? 'https' : 'http') . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]",
        'stack' => 'php'
    ])
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $verdict = json_decode($response, true);
    $isBlocked = empty($verdict['isHuman']) 
        || ($verdict['action'] ?? '') === 'Blocked' 
        || ($verdict['action'] ?? '') === 'Restricted';

    if ($isBlocked) {
        ${deflectionSnippet}
    }
}
// Legitimate humans continue executing your campaign or application normally
\`\`\`

## Step 2: Verify in Browser & Terminal
1. Test legitimate browser visit -> Loads campaign page with HTTP 200.
2. Test automated bot:
   \`curl -i -A "PetalBot" http://yourdomain.com/\`
   Confirm deflection (${deflectionAction === '404' ? 'HTTP 404' : deflectionAction === 'redirect' ? 'HTTP 302' : 'HTTP 403'}).
`;
}

export function generateWordPressAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const deflectionAction = options.deflectionAction === "404" ? "404" : "403";

  return `# Add CleanTraffic Protection to WordPress / WooCommerce

Install CleanTraffic into this WordPress site to screen traffic before pages or WooCommerce checkout flows execute. This blocks scrapers, spam bots, and checkout fraud while letting verified human shoppers pass with 0ms delay.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Classification Endpoint: ${endpoint}/api/classify
- Deflection Action: ${deflectionAction === '404' ? 'HTTP 404 Not Found (Stealth drop)' : 'HTTP 403 Forbidden - Access Denied'}

## Step 1: Install as a Must-Use (MU) Plugin
Create a file at \`wp-content/mu-plugins/cleantraffic-shield.php\` (create the \`mu-plugins\` folder if it does not exist).
*Must-Use plugins run automatically on every request without requiring manual dashboard activation.*

\`\`\`php
<?php
/**
 * Plugin Name: CleanTraffic WordPress & WooCommerce Guard
 * Description: Real-time edge bot filtering and traffic verification.
 * Version: 1.0.0
 * Author: CleanTraffic
 */

if (!defined('ABSPATH')) exit;

add_action('plugins_loaded', 'cleantraffic_verify_visitor', 1);

function cleantraffic_verify_visitor() {
    // 1. Bypass WP-Admin, cron jobs, and background AJAX endpoints
    if (is_admin() || (defined('DOING_CRON') && DOING_CRON) || (defined('DOING_AJAX') && DOING_AJAX) || (defined('REST_REQUEST') && REST_REQUEST)) {
        return;
    }

    // 2. Bypass static media assets
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('/\\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|woff2|ttf)$/i', $uri)) {
        return;
    }

    $apiKey = '${apiKey}';
    $endpoint = '${endpoint}/api/classify';

    // 3. Resolve client IP across Cloudflare, reverse proxies, and host headers
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] 
        ?? $_SERVER['HTTP_X_REAL_IP'] 
        ?? explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')[0] 
        ?? $_SERVER['REMOTE_ADDR'] 
        ?? '127.0.0.1';

    $payload = json_encode([
        'apiKey' => $apiKey,
        'ip' => trim($ip),
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'url' => (is_ssl() ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? '') . $uri,
        'stack' => 'wordpress'
    ]);

    // 4. Fast sub-second classification
    $response = wp_remote_post($endpoint, [
        'timeout' => 1.2,
        'headers' => [
            'Content-Type' => 'application/json',
            'X-API-Key' => $apiKey
        ],
        'body' => $payload
    ]);

    if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $isBlocked = empty($body['isHuman']) 
            || ($body['action'] ?? '') === 'Blocked' 
            || ($body['action'] ?? '') === 'Restricted';

        if ($isBlocked) {
            nocache_headers();
            ${deflectionAction === '404' 
              ? `status_header(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo "404 Not Found";
            exit;` 
              : `status_header(403);
            header('Content-Type: text/plain; charset=utf-8');
            echo "403 Forbidden - Access Denied";
            exit;`}
        }
    }
}
\`\`\`

## Step 2: Verification
1. Visit your site homepage or shop page in a regular browser -> Loads normally with HTTP 200.
2. In terminal, test bot blocking:
   \`curl -i -A "Bytespider" https://yourdomain.com/\`
   Confirm deflected with ${deflectionAction === '404' ? 'HTTP 404' : 'HTTP 403'}.
`;
}

export function generateShopifyAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const deflectionAction = options.deflectionAction === "404" ? "404" : "403";

  return `# Add CleanTraffic Protection Tag to Shopify Store

Add CleanTraffic client-side bot detection, hardware entropy collection, and traffic monitoring to this Shopify theme.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Script URL: ${endpoint}/v1/protect.js
- Bot Deflection Rule: ${deflectionAction === '404' ? 'HTTP 404 (Stealth Drop - page appears non-existent to scrapers)' : 'HTTP 403 (Forbidden - access denied in-place)'}

## Step 1: Add to Theme Layout
In the Shopify theme repository or Theme Code Editor:
1. Locate \`layout/theme.liquid\`.
2. Find the closing \`</head>\` tag.
3. Insert the CleanTraffic script tag immediately before \`</head>\`:

\`\`\`html
<!-- CleanTraffic Shopify Protection & Device Entropy Collector -->
<script 
  src="${endpoint}/v1/protect.js" 
  data-api-key="${apiKey}" 
  async>
</script>
\`\`\`

## Step 2: Preserve Ad Tracking & Checkout Tokens
CleanTraffic works asynchronously without interfering with:
- Shopify checkout funnel and cart operations
- Facebook Pixel / Meta Conversions API (CAPI)
- Google Analytics / Google Ads conversion tracking tokens (gclid, wbraid, gbraid)
- TikTok Click IDs (ttclid)

## Step 3: Verification & Rule Enforcement
1. Open your storefront in a browser and check the developer tools Console & Network tabs.
2. Confirm \`protect.js\` loads with status 200 for real shoppers.
3. When automated bots or scrapers hit your storefront, CleanTraffic automatically enforces an in-place ${deflectionAction === '404' ? 'HTTP 404' : 'HTTP 403'} screen before bots can scrape prices or submit fake checkouts.
4. Confirm visitor sessions register live in the CleanTraffic dashboard at ${endpoint}/dashboard?tab=traffic.
`;
}

export function generateJsAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Add CleanTraffic JavaScript Tag (HTML / Webflow / Wix)

Integrate CleanTraffic into any standard HTML page, landing page builder (Webflow, Wix, Squarespace, Unbounce), or static web project.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Script URL: ${endpoint}/v1/protect.js

## Step 1: Insert into <head>
Place this script in your project's \`<head>\` section in \`index.html\` or in your site builder's Custom Code settings (Head Code):

\`\`\`html
<!-- CleanTraffic Universal Web Agent -->
<script src="${endpoint}/v1/protect.js" data-api-key="${apiKey}" async></script>
\`\`\`

## Step 2: (Optional) Access Signals Programmatically
To inspect the hardware entropy verdict in your frontend code:

\`\`\`javascript
window.CleanTraffic && window.CleanTraffic.get().then(function(result) {
  console.log("Visitor ID:", result.visitorId);
  console.log("Is Verified Human:", result.isHuman);
  console.log("Device Trust Score:", result.trustScore);
});
\`\`\`

## Step 3: Verification
Visit your page in a browser. The CleanTraffic agent runs in the background and sends hardware entropy signals to your live dashboard in ~12ms.
`;
}

export function generateReactAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Add CleanTraffic SDK to React SPA (Vite / CRA)

Integrate the CleanTraffic visitor verification SDK into a React single-page application.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Script URL: ${endpoint}/v1/protect.js

## Step 1: Add Script to index.html or Root Component
In \`index.html\` inside the \`<head>\`:
\`\`\`html
<!-- CleanTraffic React Agent -->
<script src="${endpoint}/v1/protect.js" data-api-key="${apiKey}" async></script>
\`\`\`

## Step 2: Create a React Hook for Visitor Signals
Create \`src/hooks/useCleanTraffic.ts\`:

\`\`\`typescript
import { useState, useEffect } from 'react';

declare global {
  interface Window {
    CleanTraffic?: {
      get: () => Promise<{
        visitorId: string;
        isHuman: boolean;
        riskScore: number;
        trustScore: number;
      }>;
    };
  }
}

export function useCleanTraffic() {
  const [verdict, setVerdict] = useState<{
    visitorId?: string;
    isHuman?: boolean;
    riskScore?: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.CleanTraffic) {
      window.CleanTraffic.get().then(setVerdict).catch(console.error);
    }
  }, []);

  return verdict;
}
\`\`\`

## Step 3: Verify
Run \`npm run dev\` and open the application. Confirm no console errors and check the CleanTraffic Live Feed dashboard.
`;
}

export function generateGtmAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Add CleanTraffic via Google Tag Manager (GTM)

Deploy CleanTraffic across all your website pages using Google Tag Manager without touching source code.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Script URL: ${endpoint}/v1/protect.js

## Step 1: Create a New Tag in GTM
1. In your Google Tag Manager Workspace, navigate to **Tags** -> Click **New**.
2. Name the tag: **CleanTraffic - Bot Shield & Entropy Agent**.
3. Under **Tag Configuration**, select **Custom HTML**.
4. Paste the following HTML into the code field:

\`\`\`html
<script src="${endpoint}/v1/protect.js" data-api-key="${apiKey}" async></script>
\`\`\`

## Step 2: Configure the Trigger
1. Under **Triggering**, select **Consent Initialization - All Pages** (or **Initialization - All Pages**).
   *Running on initialization ensures device entropy signals are measured early in page lifecycle.*

## Step 3: Publish the GTM Container
1. Click **Submit** in the upper right corner of GTM.
2. Enter version name (e.g., "Added CleanTraffic Protection Tag") and click **Publish**.
3. Test your site in GTM Preview mode to confirm the tag fires.
`;
}

export function generatePythonAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const deflectionAction = options.deflectionAction === "404" ? "404" : "403";

  return `# Add CleanTraffic Middleware to Python (FastAPI / Starlette)

Set up CleanTraffic in this Python FastAPI backend to filter bots, scrapers, and malicious request patterns before route execution.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Classification Endpoint: ${endpoint}/api/classify
- Deflection Action: ${deflectionAction === '404' ? 'HTTP 404 Not Found' : 'HTTP 403 Forbidden'}

## Step 1: Add the Middleware
In your FastAPI application (e.g. \`main.py\`):

\`\`\`python
import os
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse

app = FastAPI()

CLEANTRAFFIC_API_KEY = os.getenv("CLEANTRAFFIC_API_KEY", "${apiKey}")
ENDPOINT = "${endpoint}/api/classify"

@app.middleware("http")
async def cleantraffic_guard(request: Request, call_next):
    # 1. Bypass static files and health checks
    path = request.url.path
    if path in ["/health", "/favicon.ico"] or path.startswith("/static/"):
        return await call_next(request)

    # 2. Extract visitor IP
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")

    # 3. Classify traffic (fail-open on network timeout)
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.post(
                ENDPOINT,
                headers={"Content-Type": "application/json", "X-API-Key": CLEANTRAFFIC_API_KEY},
                json={
                    "apiKey": CLEANTRAFFIC_API_KEY,
                    "ip": ip,
                    "userAgent": request.headers.get("user-agent", ""),
                    "url": str(request.url),
                    "stack": "python"
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                is_blocked = not data.get("isHuman", True) or data.get("action") in ["Blocked", "Restricted"]
                if is_blocked:
                    ${deflectionAction === '404' 
                      ? 'return PlainTextResponse("404 Not Found", status_code=404)' 
                      : 'return PlainTextResponse("403 Forbidden - Access Denied", status_code=403)'}
    except Exception:
        pass  # Fail-open guarantee

    return await call_next(request)
\`\`\`

## Step 2: Verification
1. Run application: \`uvicorn main:app --reload\`
2. Test normal request: \`curl -i http://localhost:8000/\` -> 200 OK.
3. Test bot request: \`curl -i -A "SemrushBot" http://localhost:8000/\` -> ${deflectionAction}.
`;
}

export function generateWebflowAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const deflectionAction = options.deflectionAction === "404" ? "404" : "403";

  return `# Add CleanTraffic Protection Tag to Webflow Site

Add CleanTraffic client-side bot detection, hardware entropy collection, and ad fraud screening to this Webflow site.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Script URL: ${endpoint}/v1/protect.js
- Bot Deflection Rule: ${deflectionAction === '404' ? 'HTTP 404 (Stealth Drop - page appears non-existent to scrapers)' : 'HTTP 403 (Forbidden - access denied in-place)'}

## Step 1: Open Webflow Project Settings
1. Open your Webflow Dashboard and select your project.
2. Go to **Site Settings** (or Project Settings) -> **Custom Code**.
3. In the **Head Code** section, insert:

\`\`\`html
<!-- CleanTraffic Webflow Bot Shield & Device Entropy Collector -->
<script 
  src="${endpoint}/v1/protect.js" 
  data-api-key="${apiKey}" 
  async>
</script>
\`\`\`

## Step 2: Publish Your Site
Click **Publish** -> Select your domains and publish the changes.

## Step 3: Verification & Rule Enforcement
1. Open your live Webflow website in a browser. Open Developer Tools Console and verify that the CleanTraffic agent loads with HTTP 200 for humans.
2. When automated bots or scrapers hit your landing page, CleanTraffic immediately enforces an in-place ${deflectionAction === '404' ? 'HTTP 404' : 'HTTP 403'} screen to block ad budget draining and fake lead submissions.
3. Confirm visitor sessions register live in the CleanTraffic dashboard at ${endpoint}/dashboard?tab=traffic.
`;
}

export function generateFramerAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const deflectionAction = options.deflectionAction === "404" ? "404" : "403";

  return `# Add CleanTraffic Protection to Framer Website

Add CleanTraffic client-side bot detection and hardware entropy collection to this Framer landing page or startup website.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Script URL: ${endpoint}/v1/protect.js
- Bot Deflection Rule: ${deflectionAction === '404' ? 'HTTP 404 (Stealth Drop - page appears non-existent to scrapers)' : 'HTTP 403 (Forbidden - access denied in-place)'}

## Step 1: Add to Framer General Settings
1. Open your Framer project.
2. Click the **Gear icon** in the top navigation bar to open **Site Settings**.
3. Select **General** -> scroll down to the **Custom Code** section.
4. Under **Start of <head> tag**, paste:

\`\`\`html
<!-- CleanTraffic Framer Protection Tag -->
<script 
  src="${endpoint}/v1/protect.js" 
  data-api-key="${apiKey}" 
  async>
</script>
\`\`\`

## Step 2: Publish Changes
Click **Publish** in the top right corner of Framer to push the changes live.

## Step 3: Verification & Rule Enforcement
1. Visit your published Framer site in a new tab. Confirm \`protect.js\` executes smoothly in the background for real users.
2. Automated bots and scrapers are stopped in place with a ${deflectionAction === '404' ? '404 Not Found' : '403 Forbidden'} screen.
3. Confirm visitor telemetry appears on your CleanTraffic dashboard (${endpoint}/dashboard?tab=traffic).
`;
}

export function generateWixAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const deflectionAction = options.deflectionAction === "404" ? "404" : "403";

  return `# Add CleanTraffic Protection Tag to Wix or Squarespace

Add CleanTraffic bot filtering and visitor telemetry to your Wix or Squarespace website.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Script URL: ${endpoint}/v1/protect.js
- Bot Deflection Rule: ${deflectionAction === '404' ? 'HTTP 404 (Stealth Drop - page appears non-existent to scrapers)' : 'HTTP 403 (Forbidden - access denied in-place)'}

## For Wix Sites:
1. In your Wix Dashboard, go to **Settings** -> **Custom Code** (under Advanced).
2. Click **+ Add Custom Code**.
3. Paste the snippet below:
\`\`\`html
<script src="${endpoint}/v1/protect.js" data-api-key="${apiKey}" async></script>
\`\`\`
4. Set **Place Code in** to: **Head**.
5. Set **Add Code to Pages** to: **All Pages - Load code once**. Click **Apply**.
6. When bad bots or scrapers arrive, CleanTraffic automatically shields your site with an in-place ${deflectionAction === '404' ? 'HTTP 404' : 'HTTP 403'} screen.

## For Squarespace Sites:
1. In your Squarespace Dashboard, go to **Settings** -> **Developer Tools** (or Advanced) -> **Code Injection**.
2. In the **Header** box, paste the snippet above and click **Save**.

## Verification
Visit any page on your published website. Check your CleanTraffic dashboard to confirm live visitor traffic is tracked.
`;
}

export function generateWebSnippetAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Add CleanTraffic JavaScript Protection Agent

Integrate the CleanTraffic client-side protection agent and hardware fingerprinting collector into this web application (Shopify, Webflow, React SPA, or custom HTML).

Configuration:
- CleanTraffic API Key: ${apiKey}
- Script URL: ${endpoint}/v1/protect.js

## Step 1: Insert the Script Tag
Locate the HTML entry point (<head> section in \`index.html\`, \`theme.liquid\` in Shopify, or layout file):
\`\`\`html
<!-- CleanTraffic Client Protection & Hardware Entropy Agent -->
<script src="${endpoint}/v1/protect.js" data-api-key="${apiKey}" async></script>
\`\`\`

## Step 2: (Optional) Access Developer SDK Signals
If the application needs programmatic access to visitor identification signals:
\`\`\`javascript
window.CleanTraffic.get().then(function(verdict) {
  console.log("Visitor ID:", verdict.visitorId);
  console.log("Is Human:", verdict.isHuman);
  console.log("Risk Score:", verdict.riskScore);
});
\`\`\`

## Step 3: Verify
Open the page in the browser with dev tools console open. Confirm no errors, and verify the visitor session registers on the CleanTraffic Live Feed dashboard (${endpoint}/dashboard?tab=traffic).
`;
}

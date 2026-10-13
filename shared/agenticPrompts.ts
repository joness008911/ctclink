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
  targetStack?: "nextjs" | "cloudflare" | "php" | "wordpress" | "shopify" | "universal";
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

  const deflectionSnippet = `// Dynamic deflection verdict from live CleanTraffic rules
        if (verdict.customBody) {
          return new NextResponse(typeof verdict.customBody === 'string' ? verdict.customBody : JSON.stringify(verdict.customBody), {
            status: verdict.statusCode || 403,
            headers: { 'Content-Type': verdict.bodyType || 'application/json' }
          });
        }
        if (verdict.redirectUrl || verdict.destination) {
          return NextResponse.redirect(new URL(verdict.redirectUrl || verdict.destination, request.url));
        }
        const statusCode = verdict.statusCode || (verdict.action === '404' || verdict.statusAction === '404' ? 404 : ${deflectionAction === '404' ? 404 : 403});
        return new NextResponse(statusCode === 404 ? '404 Not Found' : '403 Forbidden - Access Denied', {
          status: statusCode,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-CleanTraffic-Shield': 'Deflected-Edge' }
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


export function generateCloudflareAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const deflectionAction = options.deflectionAction || "403";
  const botFallbackUrl = options.botFallbackUrl?.trim() || "";

  const deflectionSnippet = `// Dynamic deflection verdict from live CleanTraffic rules
        if (verdict.customBody) {
          return new Response(typeof verdict.customBody === 'string' ? verdict.customBody : JSON.stringify(verdict.customBody), {
            status: verdict.statusCode || 403,
            headers: { 'Content-Type': verdict.bodyType || 'application/json' }
          });
        }
        if (verdict.redirectUrl || verdict.destination) {
          return Response.redirect(verdict.redirectUrl || verdict.destination, 302);
        }
        const statusCode = verdict.statusCode || (verdict.action === '404' || verdict.statusAction === '404' ? 404 : ${deflectionAction === '404' ? 404 : 403});
        return new Response(statusCode === 404 ? '404 Not Found' : '403 Forbidden - Access Denied', {
          status: statusCode,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-CleanTraffic-Shield': 'Deflected-Edge' }
        });`;

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

  const deflectionSnippet = `// Dynamic deflection verdict from live CleanTraffic rules
        // 1. Dynamic Redirect URL from active Rules & Policies
        $redirectUrl = $verdict['redirectUrl'] ?? $verdict['redirect_url'] ?? $verdict['destination'] ?? null;
        if (!empty($redirectUrl)) {
            header("Location: " . $redirectUrl, true, 302);
            exit;
        }

        // 2. Dynamic HTTP Status Code & Custom Body from active Rules & Policies
        $statusCode = intval($verdict['statusCode'] ?? (${deflectionAction === "404" ? "404" : "403"}));
        http_response_code($statusCode);

        if (!empty($verdict['customBody'])) {
            $bodyType = $verdict['bodyType'] ?? 'application/json';
            header("Content-Type: $bodyType; charset=utf-8");
            echo is_string($verdict['customBody']) ? $verdict['customBody'] : json_encode($verdict['customBody']);
            exit;
        }

        header('Content-Type: text/plain; charset=utf-8');
        echo $statusCode === 404 ? "404 Not Found" : "403 Forbidden - Access Denied";
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
            $redirectUrl = $body['redirectUrl'] ?? $body['redirect_url'] ?? $body['destination'] ?? null;
            if (!empty($redirectUrl)) {
                wp_redirect($redirectUrl, 302);
                exit;
            }

            $statusCode = intval($body['statusCode'] ?? (${deflectionAction === '404' ? '404' : '403'}));
            status_header($statusCode);

            if (!empty($body['customBody'])) {
                $bodyType = $body['bodyType'] ?? 'application/json';
                header("Content-Type: $bodyType; charset=utf-8");
                echo is_string($body['customBody']) ? $body['customBody'] : json_encode($body['customBody']);
                exit;
            }

            header('Content-Type: text/plain; charset=utf-8');
            echo $statusCode === 404 ? "404 Not Found" : "403 Forbidden - Access Denied";
            exit;
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

  return `# Add CleanTraffic JavaScript SDK to Website

Identify visitors on your website and screen traffic with zero external dependencies.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Script URL: ${endpoint}/v1/protect.js

## Step 1: Insert into <head>
Place this script in your project's \`<head>\` in \`index.html\` or in your site's header template:

\`\`\`html
<!-- CleanTraffic Universal Web Agent -->
<script src="${endpoint}/v1/protect.js" data-api-key="${apiKey}" async></script>
\`\`\`

## Step 2: Access Visitor Signals Programmatically
To inspect verified visitor identity, bot classification, and trust scores in your JavaScript:

\`\`\`javascript
if (window.CleanTraffic && typeof window.CleanTraffic.get === 'function') {
  window.CleanTraffic.get().then(function(visitor) {
    console.log("Visitor ID:", visitor.visitorId);
    console.log("Is Verified Human:", visitor.isHuman);
    console.log("Device Trust Score:", visitor.confidenceScore || visitor.trustScore);
  });
}
\`\`\`

## Step 3: Verify
1. Open your website in a browser.
2. Open DevTools Console: confirm \`protect.js\` executes in ~12ms.
3. Watch real-time visitor sessions register in your CleanTraffic Live Feed dashboard.
`;
}

export function generateReactAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Add CleanTraffic to React (Vite / CRA / Next.js)

Identify visitors on your React website and screen traffic with zero external dependencies.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Script URL: ${endpoint}/v1/protect.js

## Step 1: Create the React Hook
Create \`src/hooks/useCleanTraffic.ts\`:

\`\`\`typescript
import { useEffect, useState } from 'react';

export interface CleanTrafficVisitor {
  visitorId?: string;
  deviceId?: string;
  isHuman?: boolean;
  action?: string;
  confidenceScore?: number;
  country?: string;
}

export function useCleanTraffic() {
  const [visitor, setVisitor] = useState<CleanTrafficVisitor | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. SSR check
    if (typeof window === 'undefined' || !window.document) return;

    // 2. Inject CleanTraffic core client agent if not present
    if (!document.getElementById('cleantraffic-agent')) {
      const script = document.createElement('script');
      script.id = 'cleantraffic-agent';
      script.src = '${endpoint}/v1/protect.js';
      script.setAttribute('data-api-key', '${apiKey}');
      script.async = true;
      document.head.appendChild(script);
    }

    // 3. Resolve visitor signals and hardware entropy asynchronously
    const checkInterval = setInterval(() => {
      if ((window as any).CleanTraffic && typeof (window as any).CleanTraffic.get === 'function') {
        clearInterval(checkInterval);
        (window as any).CleanTraffic.get().then((res: CleanTrafficVisitor) => {
          setVisitor(res);
          setLoading(false);
        });
      }
    }, 50);

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      setLoading(false);
    }, 3500);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, []);

  return { visitor, loading };
}
\`\`\`

## Step 2: Use in Your Component
In your login, signup, or protected checkout component:

\`\`\`tsx
import React from 'react';
import { useCleanTraffic } from './hooks/useCleanTraffic';

export function ProtectedComponent() {
  const { visitor, loading } = useCleanTraffic();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (visitor && !visitor.isHuman) {
      alert('Automated bot traffic detected. Access restricted.');
      return;
    }
    console.log('Verified human visitor:', visitor?.visitorId);
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={loading}>
        {loading ? 'Verifying security...' : 'Submit Form'}
      </button>
      {visitor && (
        <p className="text-xs text-slate-500 mt-2">
          Visitor ID: {visitor.visitorId} ({visitor.isHuman ? 'Verified Human' : 'Restricted'})
        </p>
      )}
    </form>
  );
}
\`\`\`

## Step 3: Verify
1. Start your local dev server (\`npm run dev\`).
2. Open your app in a browser and check DevTools Console.
3. Confirm visitor identification registers live on your CleanTraffic dashboard.
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

export function generateVueAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Add CleanTraffic to Vue.js / Nuxt 3

Integrate CleanTraffic visitor identification and bot protection into this Vue 3 or Nuxt 3 project using a clean Composition API composable.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Classification Agent URL: ${endpoint}/v1/protect.js

## Step 1: Create the Composable
Create \`composables/useCleanTraffic.ts\` (in Nuxt 3 this is auto-imported, or import it in Vue 3/Vite):

\`\`\`typescript
// composables/useCleanTraffic.ts (Vue 3 / Nuxt 3)
import { ref, onMounted } from 'vue';

export interface CleanTrafficVisitor {
  visitorId?: string;
  deviceId?: string;
  isHuman?: boolean;
  action?: string;
  confidenceScore?: number;
}

export function useCleanTraffic() {
  const visitor = ref<CleanTrafficVisitor | null>(null);
  const loading = ref<boolean>(true);

  onMounted(() => {
    // 1. SSR check (essential for Nuxt / Vite SSR)
    if (typeof window === 'undefined') return;

    // 2. Inject CleanTraffic agent if not present
    if (!document.getElementById('cleantraffic-agent')) {
      const script = document.createElement('script');
      script.id = 'cleantraffic-agent';
      script.src = '${endpoint}/v1/protect.js';
      script.setAttribute('data-api-key', '${apiKey}');
      script.async = true;
      document.head.appendChild(script);
    }

    // 3. Resolve visitor data asynchronously
    const timer = setInterval(() => {
      if ((window as any).CleanTraffic && typeof (window as any).CleanTraffic.get === 'function') {
        clearInterval(timer);
        (window as any).CleanTraffic.get().then((res: CleanTrafficVisitor) => {
          visitor.value = res;
          loading.value = false;
        });
      }
    }, 50);

    setTimeout(() => {
      clearInterval(timer);
      loading.value = false;
    }, 3500);
  });

  return { visitor, loading };
}
\`\`\`

## Step 2: Use in Component
In your login, signup, or protected checkout component:

\`\`\`vue
<script setup>
import { useCleanTraffic } from '@/composables/useCleanTraffic';

const { visitor, loading } = useCleanTraffic();

function handleFormSubmit() {
  if (visitor.value && !visitor.value.isHuman) {
    alert('Automated bot traffic detected. Access restricted.');
    return;
  }
  // Proceed with legitimate human submission
  console.log('Verified human:', visitor.value?.visitorId);
}
</script>

<template>
  <form @submit.prevent="handleFormSubmit">
    <button type="submit" :disabled="loading">
      {{ loading ? 'Verifying connection...' : 'Submit' }}
    </button>
  </form>
</template>
\`\`\`

## Step 3: Verify
Run \`npm run dev\` and open the application. Inspect the console to verify visitor identification resolves and traffic logs show up in your CleanTraffic dashboard.
`;
}

export function generateAngularAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Add CleanTraffic to Angular (15 / 16 / 17 / 18)

Integrate CleanTraffic visitor verification and fraud protection into this Angular enterprise application using an Injectable service with Angular Universal SSR guards.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Classification Agent URL: ${endpoint}/v1/protect.js

## Step 1: Create the Injectable Service
Create \`src/app/services/cleantraffic.service.ts\`:

\`\`\`typescript
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CleanTrafficVisitor {
  visitorId?: string;
  deviceId?: string;
  isHuman?: boolean;
  action?: string;
  confidenceScore?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CleanTrafficService {
  private visitor: CleanTrafficVisitor | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  public async getVisitor(): Promise<CleanTrafficVisitor | null> {
    // SSR guard: do not execute DOM manipulation on server
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    if (this.visitor) return this.visitor;

    // Inject agent script if not present
    if (!document.getElementById('cleantraffic-agent')) {
      const script = document.createElement('script');
      script.id = 'cleantraffic-agent';
      script.src = '${endpoint}/v1/protect.js';
      script.setAttribute('data-api-key', '${apiKey}');
      script.async = true;
      document.head.appendChild(script);
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if ((window as any).CleanTraffic && typeof (window as any).CleanTraffic.get === 'function') {
          clearInterval(checkInterval);
          (window as any).CleanTraffic.get().then((res: CleanTrafficVisitor) => {
            this.visitor = res;
            resolve(res);
          });
        }
      }, 50);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(this.visitor);
      }, 3500);
    });
  }
}
\`\`\`

## Step 2: Inject into Components
In your target component (e.g. \`src/app/app.component.ts\`):

\`\`\`typescript
import { Component, OnInit } from '@angular/core';
import { CleanTrafficService, CleanTrafficVisitor } from './services/cleantraffic.service';

@Component({
  selector: 'app-root',
  template: \`
    <div *ngIf="visitor">
      <p>Visitor ID: {{ visitor.visitorId }}</p>
      <p>Security Status: {{ visitor.isHuman ? 'Human Verified' : 'Bot Blocked' }}</p>
    </div>
  \`
})
export class AppComponent implements OnInit {
  visitor: CleanTrafficVisitor | null = null;

  constructor(private ctc: CleanTrafficService) {}

  async ngOnInit() {
    this.visitor = await this.ctc.getVisitor();
  }
}
\`\`\`

## Step 3: Verify
Run \`ng serve\` and open your browser. Confirm zero TypeScript errors and verify visitor identification appears in the CleanTraffic dashboard.
`;
}

export function generatePreactAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Add CleanTraffic to Preact

Integrate CleanTraffic visitor verification into this Preact or Deno Fresh application using an ultra-lightweight hook with zero external dependencies.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Classification Agent URL: ${endpoint}/v1/protect.js

## Step 1: Create the Preact Hook
Create \`src/hooks/useCleanTraffic.js\`:

\`\`\`javascript
import { useState, useEffect } from 'preact/hooks';

export function useCleanTraffic() {
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!document.getElementById('cleantraffic-agent')) {
      const script = document.createElement('script');
      script.id = 'cleantraffic-agent';
      script.src = '${endpoint}/v1/protect.js';
      script.setAttribute('data-api-key', '${apiKey}');
      script.async = true;
      document.head.appendChild(script);
    }

    const checkInterval = setInterval(() => {
      if (window.CleanTraffic && typeof window.CleanTraffic.get === 'function') {
        clearInterval(checkInterval);
        window.CleanTraffic.get().then((res) => {
          setVisitor(res);
          setLoading(false);
        });
      }
    }, 50);

    const timer = setTimeout(() => {
      clearInterval(checkInterval);
      setLoading(false);
    }, 3500);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timer);
    };
  }, []);

  return { visitor, loading };
}
\`\`\`

## Step 2: Use in Component
\`\`\`javascript
import { useCleanTraffic } from './hooks/useCleanTraffic';

export function App() {
  const { visitor, loading } = useCleanTraffic();

  return (
    <div>
      {loading ? (
        <span>Checking connection security...</span>
      ) : (
        <span>Security: {visitor?.isHuman ? 'Human Verified' : 'Bot Blocked'}</span>
      )}
    </div>
  );
}
\`\`\`

## Step 3: Verify
Start the Preact dev server, inspect the console, and verify the verification session in your CleanTraffic dashboard.
`;
}

export function generateSvelteAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Add CleanTraffic to Svelte / SvelteKit

Integrate CleanTraffic visitor verification into this Svelte 4 / 5 or SvelteKit application using a dedicated reactive component and writable store.

Configuration:
- CleanTraffic API Key: ${apiKey}
- Classification Agent URL: ${endpoint}/v1/protect.js

## Step 1: Create the Component & Store
Create \`src/lib/CleanTraffic.svelte\`:

\`\`\`svelte
<!-- src/lib/CleanTraffic.svelte (Svelte / SvelteKit) -->
<script context="module">
  import { writable } from 'svelte/store';
  export const visitor = writable(null);
  export const isReady = writable(false);
</script>

<script>
  import { onMount } from 'svelte';

  onMount(() => {
    if (typeof window === 'undefined') return;

    if (!document.getElementById('cleantraffic-agent')) {
      const script = document.createElement('script');
      script.id = 'cleantraffic-agent';
      script.src = '${endpoint}/v1/protect.js';
      script.setAttribute('data-api-key', '${apiKey}');
      script.async = true;
      document.head.appendChild(script);
    }

    const interval = setInterval(() => {
      if (window.CleanTraffic && typeof window.CleanTraffic.get === 'function') {
        clearInterval(interval);
        window.CleanTraffic.get().then((data) => {
          visitor.set(data);
          isReady.set(true);
        });
      }
    }, 50);

    return () => clearInterval(interval);
  });
</script>
\`\`\`

## Step 2: Mount in Root Layout or Target Page
In \`src/routes/+layout.svelte\` or your target component:

\`\`\`svelte
<script>
  import CleanTraffic, { visitor, isReady } from '$lib/CleanTraffic.svelte';
</script>

<!-- Mount CleanTraffic Agent -->
<CleanTraffic />

{#if $isReady}
  <p>Visitor ID: {$visitor?.visitorId}</p>
  <p>Status: {$visitor?.isHuman ? 'Human Verified' : 'Restricted'}</p>
{:else}
  <p>Verifying security...</p>
{/if}

<slot />
\`\`\`

## Step 3: Verify
Run \`npm run dev\` and open the site. Inspect that visitor entropy is collected and verification arrives in your live CleanTraffic dashboard.
`;
}

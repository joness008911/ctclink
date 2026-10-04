/**
 * Agentic AI Integration Prompts for CleanTraffic
 * Formatted specifically for LLM Coding Agents (Cursor, Windsurf, Claude Code, GitHub Copilot, ChatGPT)
 * Modeled after modern DevSecOps standards (Fingerprint.com style).
 * 
 * 100% SELF-CONTAINED:
 * Users DO NOT need to download or attach any files!
 * The complete, zero-dependency source code is embedded directly inside the prompt.
 */

export interface AgentPromptOptions {
  apiKeyValue?: string;
  effectiveEndpoint: string;
  targetStack?: "universal" | "nodejs" | "nextjs" | "fastify" | "cloudflare" | "php" | "wordpress" | "shopify" | "html";
  failMode?: string;
  timeoutMs?: number;
}

export function generateUniversalAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const failMode = options.failMode || "open";
  const timeoutMs = options.timeoutMs && options.timeoutMs >= 200 ? options.timeoutMs : 800;

  return `# Add CleanTraffic Bot Protection & Visitor Intelligence

Set up CleanTraffic to protect this application against bot traffic, ad click fraud, and automated scrapers while passing legitimate human visitors with zero visual delay. Implement this installation step-by-step and verify that it works.

Your CleanTraffic API Key: ${apiKey}
CleanTraffic Endpoint: ${endpoint}
Fail Mode: ${failMode} (allow traffic if verification API times out)
Verification Timeout: ${timeoutMs}ms

Documentation: ${endpoint}/docs
API Reference: ${endpoint}/docs#api

## Step 1: Detect the Framework and Architecture

Inspect package.json and project files to determine the framework (check in this order):
- "next" in dependencies -> Next.js (Implement root middleware.ts using Next.js Edge Middleware)
- "fastify" in dependencies -> Fastify (Implement cleantrafficFastify.js request hook)
- "express" in dependencies -> Express.js (Implement middleware/cleantraffic.js with app.use)
- "wrangler" or wrangler.toml present -> Cloudflare Worker (Edge worker script)
- *.php files or WordPress root -> PHP / WordPress (Drop-in index.php shield or plugin)
- Pure HTML, React SPA, or Shopify -> Client-side JavaScript Protection Agent (<script> tag)

If the project directory is empty or has no project, ask the user which framework to scaffold (default to Next.js or Express) before continuing.

## Step 2: Implementation Guidelines & Rules

1. Zero External Dependencies:
   - For Node.js (Express, Fastify, Next.js), use native Node 18+ global fetch and AbortSignal.timeout(${timeoutMs}). Do NOT install or require 'axios' or 'cookie-parser'.
2. Non-Redirecting Edge Protection:
   - When a visitor is classified as HUMAN, pass them through seamlessly (call next() in Express, NextResponse.next() in Next.js). NEVER 302-redirect humans away to third-party domains.
   - When a visitor is classified as BLOCKED (bot, datacenter scraper, or click fraud), return HTTP 403 Forbidden or 404 Not Found at the edge.
3. In-Memory Verdict Caching (0ms Repeat Latency):
   - To prevent delaying repeated page clicks with external HTTP roundtrips, maintain a server-authoritative in-memory Map cache keyed by visitor IP with a 1-hour TTL. Repeat human visits resolve in 0.01ms.
   - Do NOT rely on client-supplied cookies for bypass validation, as cookies can be forged by attackers.
4. Static Asset & Health Check Bypass:
   - Always skip static assets matching: /\\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|mp4|webm|pdf|map|json|txt|xml)$/i
   - Always skip health endpoints: /health, /healthz, /favicon.ico, /robots.txt
5. Safe Fail-Open Reliability:
   - If the CleanTraffic classification endpoint times out (${timeoutMs}ms) or is temporarily unreachable, fail open smoothly so legitimate user traffic is never interrupted.

## Step 3: Reference Code

### If Next.js detected, create \`middleware.ts\`:
\`\`\`typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_KEY = process.env.CLEANTRAFFIC_API_KEY || '${apiKey}';
const ENDPOINT = '${endpoint}';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|mp4|webm|pdf|map|json|txt|xml)$/i)
  ) {
    return NextResponse.next();
  }

  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.ip 
    || '127.0.0.1';

  try {
    const res = await fetch(\`\${ENDPOINT}/api/classify\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        apiKey: API_KEY,
        ip,
        userAgent: request.headers.get('user-agent') || '',
        url: request.url
      }),
      signal: AbortSignal.timeout(${timeoutMs}),
    });

    if (res.ok) {
      const verdict = await res.json();
      const isHuman = Boolean(verdict.isHuman || verdict.is_human || verdict.visitorType === 'Human');
      const action = String(verdict.action || '');
      if (!isHuman || action === 'Blocked' || action === 'Restricted' || action === '403' || action === '404') {
        const is404 = action === '404' || verdict.statusCode === 404;
        return new NextResponse(is404 ? '404 Not Found' : '403 Forbidden - Access Denied', {
          status: is404 ? 404 : 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }
  } catch (e) {
    // Fail open
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
\`\`\`

### If Express.js detected, create \`middleware/cleantraffic.js\`:
\`\`\`javascript
const API_KEY = process.env.CLEANTRAFFIC_API_KEY || '${apiKey}';
const ENDPOINT = '${endpoint}';
const verdictCache = new Map();
const STATIC_ASSET_REGEX = /\\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|mp4|webm|pdf|map|json|txt|xml)$/i;

function cleanTrafficMiddleware() {
  return async function(req, res, next) {
    if (STATIC_ASSET_REGEX.test(req.path) || req.path === '/health' || req.path === '/favicon.ico') {
      return next();
    }
    const ip = req.headers['cf-connecting-ip'] 
      || req.headers['x-real-ip']
      || req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.socket.remoteAddress 
      || '127.0.0.1';

    const cached = verdictCache.get(ip);
    if (cached && cached.expires > Date.now()) {
      return cached.isHuman ? next() : res.status(cached.statusCode || 403).send(cached.statusCode === 404 ? '404 Not Found' : '403 Forbidden - Access Denied');
    }

    try {
      const response = await fetch(\`\${ENDPOINT}/api/classify\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({
          apiKey: API_KEY,
          ip,
          userAgent: req.headers['user-agent'] || '',
          url: req.protocol + '://' + (req.get('host') || 'localhost') + req.originalUrl
        }),
        signal: AbortSignal.timeout(${timeoutMs})
      });

      if (response.ok) {
        const data = await response.json();
        const isHuman = Boolean(data.isHuman || data.is_human || data.visitorType === 'Human');
        const action = String(data.action || '');
        const statusCode = data.statusCode || (action === '404' ? 404 : 403);
        const isBlocked = !isHuman || action === 'Blocked' || action === '403' || action === '404';

        verdictCache.set(ip, { isHuman: !isBlocked, statusCode, expires: Date.now() + 3600000 });
        if (!isBlocked) return next();
        return res.status(statusCode).send(statusCode === 404 ? '404 Not Found' : '403 Forbidden - Access Denied');
      }
    } catch (err) {
      // Fail-open
    }
    return next();
  };
}

module.exports = cleanTrafficMiddleware;
\`\`\`

## Step 4: Verify It Works

1. Start the dev server (e.g., npm run dev or npm start).
2. Open the app locally in the browser (e.g. http://localhost:3000). Confirm the landing page renders with HTTP 200 OK.
3. In a terminal, simulate an automated bot:
   curl -i -A "Googlebot" http://localhost:3000/
   curl -i -A "python-requests/2.28" http://localhost:3000/
   Confirm the bot is blocked with HTTP 403 Forbidden or 404 Not Found.
4. Check the CleanTraffic Live Feed dashboard (${endpoint}/app) to view the logged visitor event and threat analysis.
`;
}

export function generateExpressAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs && options.timeoutMs >= 200 ? options.timeoutMs : 800;

  return `# Add CleanTraffic Middleware to Express.js

Set up CleanTraffic in this Express.js application to filter out malicious bots and scrapers at the gateway while passing real humans with 0ms repeat latency.

Your CleanTraffic API Key: ${apiKey}
Endpoint: ${endpoint}
Timeout: ${timeoutMs}ms

## Step 1: Create the Middleware File
Create \`middleware/cleantraffic.js\` (or \`src/middleware/cleantraffic.js\`):
\`\`\`javascript
// middleware/cleantraffic.js (Zero-dependency Express Middleware)
const API_KEY = process.env.CLEANTRAFFIC_API_KEY || '${apiKey}';
const ENDPOINT = '${endpoint}';
const TIMEOUT_MS = ${timeoutMs};

const verdictCache = new Map();
const STATIC_ASSET_REGEX = /\\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|mp4|webm|pdf|map|json|txt|xml)$/i;

// Garbage collection for cache
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of verdictCache.entries()) {
    if (entry.expires <= now) verdictCache.delete(ip);
  }
}, 15 * 60 * 1000).unref?.();

function cleanTrafficMiddleware() {
  return async function(req, res, next) {
    if (STATIC_ASSET_REGEX.test(req.path) || req.path === '/health' || req.path === '/favicon.ico') {
      return next();
    }

    const ip = req.headers['cf-connecting-ip'] 
      || req.headers['x-real-ip']
      || req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.socket.remoteAddress 
      || '127.0.0.1';

    const cached = verdictCache.get(ip);
    if (cached && cached.expires > Date.now()) {
      if (cached.isHuman) return next();
      return res.status(cached.statusCode || 403).send(cached.statusCode === 404 ? '404 Not Found' : '403 Forbidden - Access Denied');
    }

    try {
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
          url: req.protocol + '://' + (req.get('host') || 'localhost') + req.originalUrl
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });

      if (response.ok) {
        const data = await response.json();
        const isHuman = Boolean(data.isHuman || data.is_human || data.visitorType === 'Human');
        const action = String(data.action || '');
        const statusCode = data.statusCode || (action === '404' ? 404 : 403);
        const isBlocked = !isHuman || action === 'Blocked' || action === 'Restricted' || action === '403' || action === '404';

        verdictCache.set(ip, { isHuman: !isBlocked, statusCode, expires: Date.now() + 3600000 });
        if (!isBlocked) return next();
        return res.status(statusCode).send(statusCode === 404 ? '404 Not Found' : '403 Forbidden - Access Denied');
      }
    } catch (err) {
      // Fail-open: allow request to proceed without interruption
    }
    return next();
  };
}

module.exports = cleanTrafficMiddleware;
\`\`\`

## Step 2: Register in Express App
In the main app file (app.js, server.js, or src/index.ts):
\`\`\`javascript
const cleanTraffic = require('./middleware/cleantraffic');
app.use(cleanTraffic()); // Zero npm dependencies (Node 18+)
\`\`\`

## Step 3: Test and Verify
1. Start server: \`npm start\` or \`npm run dev\`.
2. Visit in browser -> HTTP 200 (human allowed).
3. Test bot rejection: \`curl -i -A "Scrapy/2.5" http://localhost:3000/\` -> HTTP 403 Forbidden.
`;
}

export function generateNextJsAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs && options.timeoutMs >= 200 ? options.timeoutMs : 800;

  return `# Add CleanTraffic Edge Middleware to Next.js

Set up CleanTraffic in this Next.js project (App Router or Pages Router) to filter automated bots, scrapers, and ad fraud at the Vercel Edge compute layer before rendering.

Your CleanTraffic API Key: ${apiKey}
Endpoint: ${endpoint}
Timeout: ${timeoutMs}ms

## Step 1: Create or Update middleware.ts
In the root directory of the Next.js project:
\`\`\`typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_KEY = process.env.CLEANTRAFFIC_API_KEY || '${apiKey}';
const ENDPOINT = '${endpoint}';
const TIMEOUT_MS = ${timeoutMs};

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname.match(/\\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|mp4|webm|pdf|map|json|txt|xml)$/i)
  ) {
    return NextResponse.next();
  }

  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.ip 
    || '127.0.0.1';

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
        userAgent: request.headers.get('user-agent') || '',
        queryString: search ? search.substring(1) : '',
        referer: request.headers.get('referer') || '',
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

      if (isBlocked) {
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
    // Fail-open: continue request smoothly
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
\`\`\`

## Step 2: Verify Edge Execution
1. Run \`npm run dev\`.
2. Open \`http://localhost:3000\` in browser -> Page loads normally.
3. Run \`curl -i -A "curl/7.68.0" http://localhost:3000/\` -> HTTP 403 Forbidden.
4. Verify event in CleanTraffic Live Feed dashboard (${endpoint}/app).
`;
}

export function generateCloudflareAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Deploy CleanTraffic Cloudflare Edge Worker

Deploy CleanTraffic as a Cloudflare Edge Worker to protect your domain across Cloudflare's 300+ Edge POPs before incoming traffic reaches your origin server.

Your CleanTraffic API Key: ${apiKey}
CleanTraffic Endpoint: ${endpoint}

## Step 1: Detect Wrangler or Cloudflare Setup
Check if the project uses Wrangler (wrangler.toml / wrangler.jsonc).
If not, create a standard Cloudflare Worker project using \`npx wrangler init\`.

## Step 2: Implement the Worker Handler
Create the Worker fetch handler (index.js or src/index.ts):
\`\`\`javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.match(/\\.(css|js|png|jpg|svg|ico|webp|woff2)$/i) || url.pathname === '/health') {
      return fetch(request);
    }

    const apiKey = env.CLEANTRAFFIC_API_KEY || '${apiKey}';
    const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';

    try {
      const checkResp = await fetch('${endpoint}/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          apiKey,
          ip,
          userAgent: request.headers.get('user-agent') || '',
          url: request.url
        }),
        signal: AbortSignal.timeout(800)
      });

      if (checkResp.ok) {
        const verdict = await checkResp.json();
        const isHuman = Boolean(verdict.isHuman || verdict.visitorType === 'Human');
        if (!isHuman) {
          return new Response('403 Forbidden - Access Denied', { status: 403 });
        }
      }
    } catch (e) {
      // Fail open
    }

    return fetch(request);
  }
};
\`\`\`
Set secret: \`npx wrangler secret put CLEANTRAFFIC_API_KEY\` with value \`${apiKey}\`.

## Step 3: Deploy & Route
Deploy with \`npx wrangler deploy\` and map the route to \`*yourdomain.com/*\` in the Cloudflare dashboard.
`;
}

export function generatePhpAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Add CleanTraffic Protection to PHP / Apache / Nginx

Integrate CleanTraffic into this PHP application or landing page root to screen visitors using server-side cURL before rendering HTML.

Your CleanTraffic API Key: ${apiKey}
Endpoint: ${endpoint}

## Step 1: Place the PHP Shield
In the root directory of your website (e.g. public_html/index.php or prepend.php):
\`\`\`php
<?php
// CleanTraffic Verification Guard (PHP 7.4+)
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
        'url' => (isset($_SERVER['HTTPS']) ? 'https' : 'http') . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]"
    ])
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $verdict = json_decode($response, true);
    $isHuman = !empty($verdict['isHuman']) || !empty($verdict['is_human']) || ($verdict['visitorType'] ?? '') === 'Human';
    if (!$isHuman) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo "403 Forbidden - Access Denied";
        exit;
    }
}
// Legitimate humans continue executing index.php normally
\`\`\`

## Step 2: Verify in Browser & Terminal
1. Test legitimate browser visit -> Loads campaign page.
2. Test automated bot: \`curl -i -A "PetalBot" http://yourdomain.com/\` -> 403 Forbidden.
`;
}

export function generateWebSnippetAgentPrompt(options: AgentPromptOptions): string {
  const apiKey = options.apiKeyValue || "ctc_live_your_api_key_here";
  const endpoint = options.effectiveEndpoint.replace(/\/+$/, "");

  return `# Add CleanTraffic JavaScript Protection Agent

Integrate the CleanTraffic client-side protection agent and hardware fingerprinting collector into this web application (Shopify, Webflow, React SPA, or custom HTML).

Your CleanTraffic API Key: ${apiKey}
Script URL: ${endpoint}/v1/protect.js

## Step 1: Insert the Script Tag
Locate the HTML entry point (<head> section in index.html, theme.liquid in Shopify, or layout file):
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
Open the page in the browser with dev tools console open. Confirm no errors, and verify the visitor session registers on the CleanTraffic Live Feed dashboard.
`;
}

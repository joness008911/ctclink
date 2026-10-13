# Implementation Plan: Modern Web Frameworks & Unified Integrations

Expanded CleanTraffic's integration ecosystem to support modern web frameworks and platforms with dedicated, framework-native code snippets, SSR safeguards, and streamlined categorization.

---

## 1. Supported Stacks & Architecture

### Web Frameworks & SDKs (Client & Framework Native)
1. **JavaScript (Vanilla HTML / JS)**:
   - Universal asynchronous script tag (`/v1/protect.js`) and Promise-based SDK (`window.CleanTraffic.get()`).
2. **React**:
   - Custom React hook (`src/hooks/useCleanTraffic.ts`) for React 18 & 19 SPAs, Vite, and Next.js client layers.
   - Component usage example showing form submission guard before account creation.
3. **Next.js**:
   - Dual-layer integration:
     - Client Script: `<Script />` via `next/script` in `app/layout.tsx` (App Router) or `pages/_app.tsx`.
     - Edge Middleware: Zero-latency edge interceptor in `middleware.ts` running before route handlers.
4. **Vue.js**:
   - Vue 3 / Nuxt 3 composable (`composables/useCleanTraffic.ts`) with reactive `ref` states and SSR guards.
   - Component `<script setup>` usage example.
5. **Angular**:
   - Injectable `CleanTrafficService` (`src/app/services/cleantraffic.service.ts`) with Angular Universal `isPlatformBrowser` checks.
   - Component injection example.
6. **Preact**:
   - Lightweight hook (`src/hooks/useCleanTraffic.js`) with zero external bundle overhead for Preact & Deno Fresh.
7. **Svelte**:
   - Svelte 4 & 5 / SvelteKit component (`src/lib/CleanTraffic.svelte`) with reactive writable store (`$visitor`, `$isReady`).

### Server & Edge Infrastructure (Retained Standalone)
- **Cloudflare**: Universal Edge Worker with QuickEdit and Wrangler deploy modes.
- **PHP**: Dedicated `index.php` shield and customizable interstitial themes.

### CMS & Platforms (Retained Standalone)
- **WordPress**: Single-file and downloadable `.zip` Must-Use plugin.
- **Shopify**: Storefront web pixel & `theme.liquid` script.
- **Google Tag Manager**: Universal custom HTML tag for container initialization.

### Site Builders & No-Code CMS (Slashed & Grouped)
- **Wix & Squarespace**: Universal Custom Code `<head>` integration with detailed steps for both platforms.
- **Webflow & Framer**: 1-Click Custom Code integration for high-converting marketing sites and startup landing pages.

---

## 2. Directory Categorization

- **All Stacks**: Displays all 14 integrations side by side in an organized responsive grid.
- **Web Frameworks & SDKs**: Filter for JavaScript, React, Next.js, Vue.js, Angular, Preact, and Svelte.
- **Site Builders (No-Code)**: Filter for Wix, Squarespace, Webflow, and Framer.
- **Server & Edge**: Filter for Cloudflare and PHP.
- **CMS & Platforms**: Filter for WordPress, Shopify, and Google Tag Manager.

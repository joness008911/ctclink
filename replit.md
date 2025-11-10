# CleanTraffic - Pure, Clean Visitor Data

## Overview

CleanTraffic is a full-stack web application for real-time bot vs. human visitor detection and classification. It provides administrators with a dashboard for monitoring statistics, managing detection rules, and viewing classification results. The system aims to deliver clean, reliable website visitor data, supporting business insights and market potential by filtering out irrelevant bot traffic.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is a React and TypeScript application built with Vite, utilizing a component-based architecture with `shadcn/ui` (Radix UI, Tailwind CSS). State management uses TanStack Query for server state and caching, Wouter for routing, and React Hook Form with Zod for form validation. It features a dashboard with real-time statistics, detection rule management, and a robust session-based authentication system with protected routes.

### Backend Architecture

The backend is an Express.js application in TypeScript, providing a RESTful API. It handles authentication, visitor classification, statistics, and detection rules. Session management is implemented via Express session middleware. The request pipeline includes middleware for logging, JSON parsing, and error handling.

### Data Storage Solutions

CleanTraffic primarily uses PostgreSQL (Neon serverless with connection pooling) via Drizzle ORM for type-safe database operations. An abstracted storage layer supports both in-memory (development) and PostgreSQL (production). The schema includes `users`, `classifications`, `detection_rules`, and `settings` for permanent configurations like API keys.

### Authentication and Authorization

The system employs session-based authentication with Express sessions. Passwords are secured using bcrypt (10 salt rounds, min 8 characters). The authentication flow involves credential validation, server-side session creation, and middleware for API route protection. The frontend manages authentication state with React Query. Separate flows exist for admin and client users, with client users requiring username/password and API key verification. Security includes HTTP-only session cookies and timing-safe password comparisons.

### System Design Choices

CleanTraffic utilizes a cascading bot detection system: Country Whitelist, ISP Blacklist, Proxy Detection, and ISP Whitelist, prioritizing early blocking of known bots. It features real-time monitoring via frontend polling. PHP integration scripts use random ZIP filenames for security, two-pass POST architecture for accurate browser/device detection, 10-minute session caching for API calls, and client-side hash parameter conversion. Browser visits to API domains are redirected for security and privacy. Security measures include Helmet middleware for server-side security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy), blocking known scrapers/preview bots, SEO prevention (noindex/nofollow, robots.txt), client-side protection (disabled right-click, dev tools, view source, text selection), and cache control. Unknown IPs default to 'Bot' and any API classification failure also defaults to 'Bot' following a fail-secure principle.

## Recent Changes

### November 10, 2025 (Latest)
- **🔧 PHP SCRIPT PRODUCTION FIX + CACHE INVALIDATION**: Resolved caching and bot detection issues
  - **Problem 1 - Headers Already Sent**: White pages and header errors on cPanel/aaPanel production servers
    - **Root Cause**: Mixed server/client logic causing premature HTML output before headers
    - **Solution**: Two-pass POST architecture - JavaScript collects browser/device data, submits form, then PHP redirects
  - **Problem 2 - Stale Cached URLs**: Changing redirect URLs in dashboard didn't take effect immediately (10-minute cache held old URLs)
    - **Root Cause**: PHP session cache stored redirect URLs without version tracking
    - **Solution**: Cache versioning system - API returns `redirectVersion` timestamp, PHP compares versions and invalidates stale caches
    - **Result**: URL changes take effect on next visitor (instant invalidation when versions mismatch)
  - **Problem 3 - Missing Bot Detection**: Local bot pattern matching was removed
    - **Root Cause**: Bot detection function defined but never invoked
    - **Solution**: Known bots (curl, wget, Googlebot, etc.) now short-circuit API calls after first visit
    - **Performance**: Saves API calls for obvious bots while maintaining accurate redirect URLs
  - **Technical Implementation**:
    - API returns `redirectVersion` (milliseconds timestamp) from `userRedirectUrls.updatedAt`
    - PHP stores version with cached redirects, compares on next visit
    - Known bots get cached bot URL without API call (after first classification)
    - Two-pass architecture: Pass 1 = JavaScript collection, Pass 2 = classification & redirect
  - **Architect Verified**: ✅ Cache versioning sound, bot detection active, production-ready
  - **Working Email Separators**: `?e=email` (query) and `#e=email` (hash)

## External Dependencies

- **Database**: Neon Database (PostgreSQL-compatible serverless)
- **UI/Styling**: Radix UI, Tailwind CSS, Lucide React
- **Development**: Vite, TypeScript, ESBuild
- **Utilities**: `date-fns`, `clsx`, `class-variance-authority`, `UA-Parser-js`, `Zod`
- **Session Store**: `connect-pg-simple` (for PostgreSQL session storage)
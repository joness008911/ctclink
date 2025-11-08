# CleanTraffic - Pure, Clean Visitor Data

## Overview

CleanTraffic is a full-stack web application designed for real-time detection and classification of bot traffic versus human visitors. Its primary purpose is to provide administrators with a dashboard to monitor statistics, manage detection rules, and view classification results. The system uses an Express.js API backend and a React frontend, leveraging `shadcn/ui` for its user interface. CleanTraffic aims to provide a clean and reliable view of website visitor data.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 8, 2025 (Latest)
- **🔒 ENHANCED SECURITY - OBSCURED ADMIN ROUTES**: Moved admin interface to harder-to-guess routes for improved security
  - **Admin Route Change**: Admin interface moved from `/admin` to `/interface` (harder to guess, reduces automated attacks)
  - **Client User Route**: Client users now access their dashboard at `/user` instead of root
  - **Root Redirect**: Root domain `/` now redirects to Google.com (makes site appear inactive to casual browsers)
  - **API Endpoint Updates**: All admin API endpoints renamed from `/api/admin/*` to `/api/interface/*`
  - **Navigation Updates**: All login redirects and navigation links updated to use new route structure
  - **Security Benefit**: Reduces attack surface by using non-standard route names instead of easily-guessed paths
- **📊 INCREASED LOG RETENTION**: Upgraded from 50 to 100 classification records with 24-hour auto-purge
  - **100 Record Limit**: Client users can now view last 100 visitor classifications (was 50)
  - **24-Hour Auto-Reset**: Classifications older than 24 hours are automatically deleted
  - **Analytics Reset**: All analytics (human/bot counts, locations) automatically reset every 24 hours
  - **Both Storage Types**: Auto-cleanup works in both MemStorage and DatabaseStorage
  - **Privacy Maintained**: Email still captured via URL parameters but never stored in database
- **📧 EMAIL AUTO-GRAB - ASTERISK SEPARATOR**: Added `*` separator support for email capture
  - **New Separator**: `*e=email@example.com` now works alongside `?` and `#` separators
  - **Three Methods**: `?e=email`, `#e=email`, and `*e=email` all supported
  - **Safe Implementation**: PHP script strips asterisk separator before URL rewrite
  - **No Storage**: Email captured for redirect logic only, never saved to database

### November 1, 2025
- **📧 EMAIL AUTO-GRAB FIX**: Fixed email parameter extraction bugs and removed non-working dollar separator
  - **Fixed Hash Parameter Bug**: Completely rewrote email extraction logic to prevent key/value duplication (was adding "e" or "email" prefix to email addresses)
  - **Improved URL Decoding**: Added proper `decodeURIComponent` handling for email values with special characters
  - **Removed Dollar Separator**: Eliminated `$e=email` method (web servers return 404 for `$` in URL paths)
  - **Working Methods**: `?e=email` and `#e=email` both work correctly now without duplication
  - **Security Enhancement**: Removed all CleanTraffic branding from diagnostic page - now shows generic "Service Configuration Required" message with error code CONFIG_001
  - **Zero Information Disclosure**: Diagnostic page no longer reveals anything about the system, classification logic, or redirect URLs
- **🔒 PRIVACY-FOCUSED DATA RETENTION**: Implemented privacy-first storage model with minimal data retention
  - **Last 50 Classifications Only**: Auto-cleanup deletes older records, keeping only 50 most recent for debugging
  - **No Email Storage**: Email capture via `?e=email` still works for redirect logic but never stored in database
  - **No User Agent Storage**: Removed userAgent field to eliminate browser fingerprinting data
  - **Client User Privacy**: Client users never see IP addresses in their dashboard (only Country, ISP, Device, Time)
  - **Admin Debugging**: Admin dashboard still shows IP addresses for last 50 classifications (debugging only)
  - **Auto-Cleanup Logic**: Both DatabaseStorage and MemStorage automatically delete oldest records when limit reached
  - **GDPR/CCPA Friendly**: Minimal data retention (50 records max) significantly reduces privacy compliance burden

### October 30, 2025
- **🔒 CRITICAL SECURITY FIX - FAIL-SECURE CLASSIFICATION**: Fixed severe vulnerability where unknown IPs bypassed bot detection
  - **Changed Default to 'Bot'**: All visitors now start as Bot and must prove they're human (was defaulting to Human - DANGEROUS!)
  - **User Agent Validation**: Missing or suspicious user agents (bot, crawler, spider, scraper, curl, wget, python, headless) are immediately blocked
  - **API Failure Protection**: ANY error during classification now defaults to Bot (was Human - allowing unknown traffic through)
  - **Fail-Secure Principle**: System now blocks unknown/suspicious traffic by default instead of allowing it
  - **Security Impact**: Prevents bots from exploiting API failures, network issues, or system errors to bypass detection
  - **IP/CIDR Blocklist Schema**: Added database tables for network-level blocking (implementation pending)
- **✅ PERMANENT DATABASE RESTORED**: Created fresh Neon database with permanent storage
  - All data now persists across server restarts (API keys, users, classifications, settings)
  - Fixed root cause: Removed async constructor calls that created zombie database connections
  - Auto-initialization creates default admin user (Mark02/Markstorey@2015) on first startup
  - Classification endpoint now uses storage layer instead of direct database access (fixes caching issues)
- **Storage Layer Improvements**: Completed full MemStorage implementation during database downtime
  - Added 29 missing methods across 8 categories (API keys, country/ISP management, client users, settings)
  - All admin dashboard features fully operational: classifications, API keys, detection rules, client users, whitelists/blacklists
  - Fixed IP2 API key endpoints to use storage abstraction instead of direct database access
  - Fixed classification endpoint to load API key from storage (resolves stale key issues)

### October 28, 2025
- **Country Field Fix**: Fixed country showing as "Unknown" in visitor logs by properly extracting and storing country_name from IP2Geolocation API
- **PHP Script Security Enhancement**: Removed all identifying comments and traces from generated PHP scripts
  - Eliminated "CleanTraffic" branding from script headers
  - Removed feature descriptions and explanatory comments
  - Stripped all comments that could help competitors understand or copy the system
  - Minimized error messages to prevent information disclosure
- **Enhanced Email Auto-Grab**: Extended email capture to support hash/fragment URL parameters
  - Added support for `#` (hash/fragment) parameters: `#e=email@example.com` or `#email=email@example.com`
  - Existing `?` (query) parameters continue to work: `?e=email@example.com` or `?email=email@example.com`
  - JavaScript automatically converts hash parameters to query parameters for server-side processing
- **API Limitation Detection**: Added automatic detection for trial/expired/unpaid IP2Geolocation API plans
  - Detects when API response lacks `usage_type` field (indicates limited/trial plan)
  - Automatically classifies all visitors as "Bot" when API is limited (safe default)
  - Sets detection method to "API Limitation - Cannot Detect (Trial/Expired Plan)" for admin visibility
  - Redirects all traffic to bot URL to prevent false positives
  - Admin dashboard shows clear reason so issues can be identified immediately
- **Location Display Format Update**: Changed location display to show City, Region, Country Code format
  - Format: "Los Angeles, California, US" instead of "United States"
  - Uses 2-letter country codes (US, BE, AT) instead of full country names
  - Shows city first, then region (state/province), then country code
  - Backend now stores city, region, and country code separately for better data granularity
- **Security Enhancements**: Implemented comprehensive security measures to prevent scraping, previewing, and unauthorized access
  - **Server-Side Security Headers**: Added Helmet middleware with strict CSP, HSTS (1 year with preload), X-Frame-Options (deny), and Referrer-Policy (no-referrer)
  - **Bot/Scraper Blocking**: Middleware blocks known scrapers and preview bots (Slack, Facebook, Twitter, Telegram, curl, wget, etc.) from all non-API routes
  - **SEO Prevention**: Meta tags for noindex/nofollow/noarchive, minimal Open Graph data, robots.txt disallows all crawling
  - **Client-Side Protection**: Disabled right-click context menu, developer tools shortcuts (F12, Ctrl+Shift+I), view source (Ctrl+U), and text selection on non-form elements
  - **Cache Control**: Headers prevent caching of sensitive pages
  - **Permissions Policy**: Disabled geolocation, microphone, camera, and payment APIs
  - Note: Rate limiting was removed due to conflicts with proxy configuration; bot blocking provides primary protection

### October 27, 2025
- **CRITICAL BUG FIXES**: Fixed production issues with PHP script integration
  - **API Response Format Fix**: Changed `visitor_type` to `visitorType` (camelCase) in API responses to match PHP script expectations
  - **Configuration Error Fix**: PHP scripts now ALWAYS receive redirect URLs (fixed "Configuration error: No redirect URL configured")
  - **Residential Proxy Fix**: Removed overly aggressive RSV (Reserved IP) blocking - only DCH (datacenter) is auto-blocked now
  - **Paused/Expired License Logic**: When license is paused or expired, ALL visitors redirect to bot URL (service suspension)
  - Added fallback redirect URLs when user lookup fails (prevents configuration errors)
  - Added warning logs when no client user found for API key
- **UI IMPROVEMENTS**: Enhanced user dashboard with professional design
  - **Country Display**: Replaced flag images with plain text country names (e.g., "United States") for better reliability
  - **Pause/Play Controls**: Added comprehensive explanation clarifying that pausing is for testing/maintenance/idle periods, redirects all traffic to bot URL, and doesn't affect expiration timeline
  - **Advanced Dashboard UI**: Implemented modern design with gradient cards, hover effects, enhanced visual hierarchy, color-coded status badges, and polished analytics display
  - **Recent Activity**: Enhanced with gradients, hover states, better typography, and improved readability
  - **Status Indicators**: Added visual icons (Play/Pause) and color coding (green for active, orange for paused, red for expired)

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, using Vite for development and bundling. It employs a component-based architecture with `shadcn/ui` (built on Radix UI and Tailwind CSS) for UI components. State management is handled by TanStack Query for server state and caching, while Wouter manages client-side routing. Form handling uses React Hook Form with Zod for validation. The application features a dashboard with real-time statistics, detection rules management, and a robust login/authentication system based on session authentication with protected routes.

### Backend Architecture

The backend is an Express.js application written in TypeScript, providing a RESTful API. Key API endpoints handle authentication, visitor classification, statistics, and detection rules management. Session management is implemented using Express session middleware. The request processing pipeline includes middleware for logging, JSON parsing, and error handling.

### Data Storage Solutions

CleanTraffic utilizes PostgreSQL, specifically through Neon serverless with connection pooling, as its primary database. Drizzle ORM provides type-safe database operations. The storage layer is abstracted, supporting both in-memory storage for development and PostgreSQL for production. The schema includes tables for `users`, `classifications` (storing visitor data and detection metadata), `detection_rules`, and `settings` (for permanent system configurations like API keys). API keys are stored permanently in the `settings` table, with updates prioritizing the database.

### Authentication and Authorization

The system uses session-based authentication with Express sessions. User passwords are secured using bcrypt hashing (10 salt rounds) and a minimum length of 8 characters. The authentication flow involves credential validation, server-side session creation, and middleware to protect API routes. The frontend manages authentication state via React Query. There are separate authentication flows for admin and client users, with client users requiring username/password and API key verification. Security measures include HTTP-only session cookies and timing-safe password comparisons.

### System Design Choices

CleanTraffic employs a cascading classification system for bot detection, involving Country Whitelist, ISP Blacklist, Proxy Detection, and ISP Whitelist. This multi-layer approach optimizes performance by blocking a significant percentage of bots early in the process. The system incorporates real-time monitoring via polling for data updates on the frontend. PHP scripts for integration utilize random ZIP filenames for security, 10-minute session caching to reduce API calls, and enhanced bot detection techniques including headless browser and known crawler identification. Browser visits to API domains are automatically redirected for security and privacy.

## External Dependencies

- **Database**: Neon Database (PostgreSQL-compatible serverless)
- **UI/Styling**: Radix UI, Tailwind CSS, Lucide React
- **Development**: Vite, TypeScript, ESBuild
- **Utilities**: `date-fns`, `clsx`, `class-variance-authority`, `UA-Parser-js`, `Zod`
- **Session Store**: `connect-pg-simple` (optional, for PostgreSQL session storage)
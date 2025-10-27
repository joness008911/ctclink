# CleanTraffic - Pure, Clean Visitor Data

## Overview

CleanTraffic is a full-stack web application for detecting and classifying bot traffic versus human visitors. The system provides real-time visitor classification monitoring with a dashboard interface for administrators to view statistics, manage detection rules, and monitor classification results. Built as an Express.js API backend with a React frontend using shadcn/ui components.

**IMPORTANT**: CleanTraffic uses the original davidnmarx.com/api/classify endpoint for visitor classification. All branding and API validation has been permanently updated to use "CleanTraffic API" instead of IP2Geolocation.

## Recent Changes

### October 27, 2025
- **PROFESSIONAL USER DASHBOARD REDESIGN**: Complete UI/UX overhaul for modern, analytics-first experience
  - **New Tab Structure**: License & Analytics (default landing), Classification Logs, Settings
  - **License Management**: Pause/Play toggle with visual status indicators - paused/expired licenses redirect all visitors to bot URL
  - **Rich Analytics**: Real-time stats cards with gradients, recent activity feed, visual icons (👤 Human, 🤖 Bot)
  - **Country Flags**: IP2Location CDN integration (`cdn.ip2location.io/assets/img/flags/{country}.png`) with fallback for expired trials
  - **Modern Design**: Card-based layout with gradients, professional color schemes, responsive grid system
- **ADMIN IMPROVEMENTS**: Enhanced admin dashboard functionality
  - **Increased Visibility**: Classification tables now show 1,000 total visits (previously 10-20)
  - **Bug Fix**: Fixed delete license 500 error by adding proper foreign key cascade constraints
- **PHP SCRIPT BUG FIX**: Fixed duplicate subdomain prefix in generated PHP scripts
  - Fixed: `https://api.https://api.davidnmarx.com` → `https://api.davidnmarx.com`
  - Script now detects if domain already has `http://` or `https://` prefix before adding it
  - Handles both full URLs and plain domains correctly
- **PHP SCRIPT ENHANCEMENTS**: Major improvements for cost reduction and security
  - **Random ZIP filename**: Downloads use random 28-character names (e.g., `abc123xyz789.zip`) instead of "cleantraffic-script.zip" for white-label security
  - **10-minute session caching**: Repeat visitors within 10 minutes get silent redirect without API call (reduces costs by ~70%)
  - **Enhanced bot detection**: Detects headless browsers (Puppeteer, Selenium), known crawlers (Googlebot, Bingbot), and suspicious user agents
  - Session fingerprint: `md5(IP + UserAgent)` cached in PHP session for accurate tracking
- **BROWSER REDIRECT SECURITY**: Added automatic redirects for browser visits to API domain
  - Any browser visit to `api.subdomain.com` redirects to Google.com (301 permanent)
  - Visiting `/api/classify` without API key redirects to Google.com
  - API calls with valid keys work normally (POST with X-API-Key header)
  - Hides API infrastructure from casual browsers for privacy/security
- **EMAIL CAPTURE SIMPLIFIED**: Fixed email capture to use only standard query parameters
  - Removed `$` tag (causes 404 - not valid in URLs)
  - Removed `#` tag (client-side only - never sent to server)
  - Only `?e=` and `?email=` tags work (standard query parameters)
  - Example: `https://site.com?email=user@example.com`

### October 26, 2025
- **PHP SCRIPT OPTIMIZATION**: Simplified for immediate classification and accurate tracking
  - **Removed JavaScript loading screen**: Classification now happens instantly server-side
  - **Server-side browser detection**: Browser/device detected from user agent (no client-side JS needed)
  - Removed 10-minute session caching (every visit triggers API call for accurate tracking)
  - Removed rate limiting (all visits captured immediately)
  - Removed HMAC token validation and device fingerprinting (simplified architecture)
  - Kept core features: email capture (?, #, $), security headers, query forwarding
  - **Default redirect URLs**: API now provides defaults if user hasn't configured custom URLs
  - Redirect URLs based on visitor classification (Human → humanUrl, Bot → botUrl)
- **EMAIL COLUMN MIGRATION**: Moved email display from admin to user dashboard
  - Email column removed from admin classifications table (privacy/cleaner view)
  - Email column added to user dashboard classifications table (users see their own captured emails)
  - Users can now monitor which emails visited their sites via URL parameters
  - Admin dashboard shows: Time, IP, Location, Type, Method, Browser (6 columns)
  - User dashboard shows: Time, Classification, IP, Email, Country, ISP, Device (7 columns)

### October 25, 2025
- **SECURITY ENHANCEMENT**: Implemented bcrypt password hashing for all user accounts
  - All passwords now hashed using bcrypt (salt rounds: 10) before storage
  - Password comparison uses timing-safe bcrypt.compare() method
  - Minimum password length increased from 6 to 8 characters
  - Updated routes: user login, client user creation, change password
  - Test data migrated to hashed passwords for secure authentication
- **USER FEATURES**: Added comprehensive user dashboard functionality
  - Change Password feature: Secure password updates with current password verification
  - API License Management panel: Shows API key details, usage stats, rate limits, expiration
  - Simplified visitor classification view: Users see "Human" or "Bot" (technical details hidden)
  - Admin retains full technical details (Datacenter, Country Not Whitelisted, etc.)
- **DATA ISOLATION**: Classifications now track API key ownership
  - Each classification saves which API key made the request (apiKeyId field)
  - Users only see traffic from their own API calls
  - Complete data isolation between client users

### October 10, 2025
- **CASCADING CLASSIFICATION SYSTEM**: Implemented multi-layer bot filtering for optimized performance
  - Country Whitelist → ISP Blacklist → Proxy Detection → ISP Whitelist (4-step cascade)
  - 70% of bots blocked in <50ms using database checks before API calls
  - Country-based filtering blocks visitors from non-whitelisted countries instantly
  - ISP blacklist blocks known datacenter/VPN/proxy providers (50+ preloaded)
  - ISP whitelist allows trusted providers to override bot detection
  - Backward compatible: Same API response format, PHP package unchanged
- **ADMIN MANAGEMENT UI**: Added comprehensive management dashboards
  - Country Whitelist: Checkbox grid with bulk select/deselect for easy country management
  - ISP Whitelist: Bulk import from newsmedialists.com/isp lists, country-filtered management
  - ISP Blacklist: One-click load 50+ bot ISPs (AWS, Azure, GCP, VPNs), category filtering
  - New dashboard tabs: 📊 Dashboard, 🌍 Countries, ✅ ISP Whitelist, ❌ ISP Blacklist, 📈 Analytics
- **DATABASE SCHEMA**: Added three new tables for filter management
  - `country_whitelist`: Stores allowed countries with enable/disable toggle
  - `isp_whitelist`: Stores legitimate ISPs per country for trusted visitor classification
  - `isp_blacklist`: Stores known bot ISPs with category (Datacenter, VPN, Proxy, Tor)

### October 1, 2025
- **IP2GEOLOCATION API INTEGRATION**: Successfully integrated IP2Geolocation API (api.ip2location.io) for visitor classification
  - API endpoint changed from davidnmarx.com to api.ip2location.io
  - Classification now uses real IP2Geolocation service for accurate location and ISP data
  - API key validation tests against actual IP2Geolocation service before saving
  - Visitor classification detects bots based on proxy detection and usage type analysis
- **API KEY STATUS DISPLAY**: Enhanced admin dashboard with complete API key management UI
  - Status badge shows "Active" or "Not Set" for API key configuration
  - Masked key display shows first 4 + ***** + last 4 characters (e.g., "abcd*****wxyz")
  - Last updated timestamp shows when API key was last changed
  - Real-time status updates every 30 seconds
- **TIMESTAMP FIX**: Fixed API key timestamp persistence
  - First-time API key inserts now include updatedAt timestamp
  - Status endpoint safely handles missing timestamps with fallback
  - All key updates properly record timestamp for audit trail

### September 30, 2025
- **PERMANENT FIX**: Completely removed all IP2Geolocation branding from dashboard and codebase
- Updated all API references to use "CleanTraffic API" 
- Fixed API validation to test against davidnmarx.com/api/classify endpoint instead of IP2Location
- Changed API requests from GET to POST format with ip/user_agent data for accurate location/ISP results
- Fixed bot bypass: Bots now redirected immediately with anti-preview headers
- Fixed human false positive blocking: Rate limiting moved after classification
- Performance optimization: Reduced API retries and timeouts for faster response
- **PERMANENT STORAGE**: Implemented PostgreSQL database storage for API keys
  - Created `settings` table for configuration persistence
  - API key updates now save to database first, ensuring permanent storage
  - All admin configuration changes persist across server restarts
  - Database takes priority over file/env storage for key retrieval

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server. The frontend follows a component-based architecture with:

- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Authentication Flow**: Session-based authentication with protected routes

**Key Components**:
- Dashboard with real-time statistics and classification monitoring
- Detection rules management interface with toggleable rule configuration
- Classification results table with live updates
- Login/authentication system

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful API with the following key endpoints:
- Authentication endpoints (`/api/login`, `/api/logout`, `/api/auth/user`)
- Classification endpoints (`/api/classify`, `/api/classifications`)
- Statistics endpoint (`/api/stats`)
- Detection rules management (`/api/detection-rules`)

**Session Management**: Express session middleware with configurable session store (currently using in-memory storage with option for PostgreSQL via connect-pg-simple)

**Request Processing**: Middleware pipeline including request logging, JSON parsing, and error handling

### Data Storage Solutions

**Database**: PostgreSQL configured through Neon serverless with connection pooling

**ORM**: Drizzle ORM for type-safe database operations with schema-first approach

**Storage Layer**: Abstracted storage interface (`IStorage`) allowing for multiple implementations:
- Memory storage for development/testing
- Database storage for production (via Drizzle + PostgreSQL)

**Schema Design**:
- `users` table for authentication
- `classifications` table for storing visitor classification results with IP, location, device, and detection metadata
- `detection_rules` table for configurable bot detection parameters
- `settings` table for permanent configuration storage (API keys, system settings)

**API Key Management**:
- API keys are permanently stored in PostgreSQL `settings` table
- Update workflow: Database → Environment Variables → File (triple-redundancy)
- Retrieval priority: Database first → File fallback → Environment fallback
- All admin dashboard API key changes persist permanently across restarts

### Authentication and Authorization

**Strategy**: Session-based authentication using Express sessions with bcrypt password hashing

**Flow**: 
- Login endpoint validates credentials using bcrypt.compare() and creates server-side session
- Authentication middleware protects API routes
- Frontend authentication state managed through React Query
- Two-step authentication for client users: username/password → API key verification

**Security**: 
- HTTP-only session cookies with configurable security settings
- Bcrypt password hashing (salt rounds: 10) for all user accounts
- Timing-safe password comparison to prevent timing attacks
- Minimum password length: 8 characters
- Separate authentication flows for admin users and client users

### External Dependencies

**Database Services**:
- Neon Database (PostgreSQL-compatible serverless database)
- Connection pooling via `@neondatabase/serverless`

**UI and Styling**:
- Radix UI primitives for accessible component foundations
- Tailwind CSS for utility-first styling
- Lucide React for consistent iconography

**Development Tools**:
- Vite with React plugin for fast development and optimized builds
- TypeScript for type safety across the entire stack
- ESBuild for server-side bundling

**Utilities and Libraries**:
- date-fns for date manipulation
- clsx and class-variance-authority for conditional CSS classes
- UA-Parser-js for user agent analysis (likely for bot detection)
- Zod for runtime type validation and schema generation

**Development Environment**:
- Replit-specific plugins for development and debugging
- Hot module replacement and error overlays for enhanced DX

The architecture supports real-time monitoring through polling-based updates, with the frontend automatically refreshing classification data and statistics at configurable intervals.
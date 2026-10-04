# CleanTraffic Engine

> Advanced Visitor Intelligence, Bot Deflection, and Multi-Tenant Traffic Management Platform.

This is a **private, proprietary repository**. All rights reserved. Do not distribute, publish, or copy without explicit authorization.

---

## Architecture Overview

CleanTraffic is a full-stack real-time bot filtering and conditional traffic routing platform:

* **Frontend:** React SPA built with Vite, TypeScript, Tailwind CSS, TanStack Query, and Radix UI primitives (`shadcn/ui`).
* **Backend:** Node.js Express server (`server/index.ts`, `server/routes.ts`) providing real-time evaluation endpoints, rate limiting, and administrative interfaces.
* **Storage Abstraction:** Pluggable storage architecture supporting Google Cloud Firestore and relational PostgreSQL / Supabase databases.
* **Integrations:** PHP tracking package generator for client sites, IP intelligence lookup with circuit breakers, and webhook lifecycles.

---

## Getting Started

### Prerequisites

* Node.js 20.x or higher
* npm or bun package manager
* Access to a provisioned PostgreSQL/Supabase database or Firestore instance

### Installation

1. Clone this private repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
4. Configure your private keys and connection strings in `.env`. **Never commit `.env` to Git.**

---

## Development & Build

* **Start Development Server:**
  ```bash
  npm run dev
  ```
* **Type Check & Lint:**
  ```bash
  npm run lint
  ```
* **Run Test Suite:**
  ```bash
  npm test
  ```
* **Build Production Bundle:**
  ```bash
  npm run build
  ```
* **Start Production Server:**
  ```bash
  npm start
  ```

---

## Security & Secrets Management

* **Zero Hardcoded Secrets:** All credentials, database connection strings, payment tokens, and external API keys must be injected strictly via environment variables.
* **Session Secrets:** Ensure `SESSION_SECRET` is set to a cryptographically secure 64-character hex string in production.
* **IP Intelligence:** External geolocation lookups can be configured either via the Admin settings UI or by setting `IP2LOCATION_API_KEY`.
* **Database Backups:** Do not commit database dump files (`backups/`) or raw client request logs to the repository.

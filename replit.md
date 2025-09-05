# Anti-Bot Detection System

## Overview

This is a full-stack web application for detecting and classifying bot traffic versus human visitors. The system provides real-time visitor classification monitoring with a dashboard interface for administrators to view statistics, manage detection rules, and monitor classification results. Built as an Express.js API backend with a React frontend using shadcn/ui components.

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

### Authentication and Authorization

**Strategy**: Session-based authentication using Express sessions

**Flow**: 
- Login endpoint validates credentials and creates server-side session
- Authentication middleware protects API routes
- Frontend authentication state managed through React Query

**Security**: HTTP-only session cookies with configurable security settings

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
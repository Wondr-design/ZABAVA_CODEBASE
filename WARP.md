# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Zabava LaserMax Dashboard is a React + TypeScript web application built with Vite. It serves as a dual-role dashboard system for partners and administrators managing submission records and analytics data. The application uses modern React patterns with shadcn/ui components and Tailwind CSS for styling.

## Development Commands

### Core Development
- `pnpm dev` - Start development server on port 3000 with API proxy
- `pnpm build` - Build production bundle
- `pnpm preview` - Preview production build locally
- `pnpm lint` - Run ESLint on all files

### Package Management
This project uses `pnpm` as the package manager. Always use `pnpm` instead of `npm` or `yarn`.

## Architecture Overview

### Application Structure
- **Dual Authentication System**: Separate login flows for partners (`/login`) and admins (`/admin/login`)
- **Role-Based Routing**: `PrivateRoute` for partners, `AdminRoute` for admins with automatic redirects
- **Context-Based State**: `AuthContext` handles authentication, JWT token management, and user sessions
- **API Proxy Configuration**: Development server proxies `/api/*` requests to backend (configurable via `VITE_DEV_API_PROXY`)

### Key Directories
- `src/pages/` - Route components split by role (partner vs admin)
- `src/components/ui/` - shadcn/ui component library (40+ components)
- `src/components/` - Custom application components (`PrivateRoute`, `AdminRoute`, `SubmissionsTable`, etc.)
- `src/context/` - React context providers (`AuthContext` for authentication)
- `src/types/` - TypeScript type definitions for dashboard data models
- `src/lib/` - Utilities (`config.ts` for API configuration, `utils.ts` for styling helpers)
- `src/hooks/` - Custom React hooks for data fetching

### Data Models
The application works with submission records that track:
- Ticket usage and visitor status
- Revenue and points analytics
- Partner information and categorization
- Admin oversight and invite management

### Authentication Flow
1. JWT-based authentication with localStorage persistence
2. Token validation on app initialization via `/api/auth/profile`
3. Automatic token expiration handling
4. Role-based access control (partner vs admin)

### Styling System
- **Tailwind CSS v4** with CSS variables for theming
- **shadcn/ui** component system with "new-york" style variant
- **Path aliases**: `@/` maps to `src/` directory
- **Lucide React** for icons

### API Integration
- Backend API proxy configured in `vite.config.js`
- Production API calls go to `https://zabava-server.vercel.app`
- Development proxy configurable via `VITE_DEV_API_PROXY` environment variable

## Development Environment

### Prerequisites
- Node.js (compatible with React 19+)
- pnpm package manager
- Backend API server running (zabava_server codebase)

### Environment Variables
- `VITE_API_BASE_URL` - API base URL for production
- `VITE_DEV_API_PROXY` - Development API proxy target (defaults to production)

### TypeScript Configuration
- Project uses TypeScript 5+ with strict mode
- Separate configs for app (`tsconfig.app.json`) and build tools (`tsconfig.node.json`)
- Path aliases configured for clean imports (`@/` for src directory)
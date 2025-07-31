# Housing Program Management System

## Overview

This is a comprehensive Housing Program Management System built with React, Express.js, and PostgreSQL. The application manages clients, properties, housing applications, financial transactions, and pool fund operations for a housing assistance program. It features a modern web interface with mobile responsiveness and uses a full-stack TypeScript architecture.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **API Pattern**: RESTful API design
- **Session Management**: Express sessions with PostgreSQL storage

### Project Structure
- `client/` - Frontend React application
- `server/` - Backend Express.js application
- `shared/` - Shared TypeScript types and database schema
- `migrations/` - Database migration files

## Key Components

### Database Schema
The application manages five main entities:

1. **Clients**: Personal and financial information for program participants
   - KYC data including SSN, employment status, income
   - Contact information and addresses
   - Status tracking (active, inactive, pending)

2. **Properties**: Available housing units and landlord information
   - Property details (address, bedrooms, bathrooms, square footage)
   - Landlord contact information
   - Rental amounts and deposit requirements
   - Availability status tracking

3. **Applications**: Housing applications linking clients to properties
   - Payment tracking (rent, deposits, application fees)
   - County reimbursement management
   - Application status workflow (pending, approved, rejected)

4. **Transactions**: Financial transaction records
   - Transaction types (payment, reimbursement, fee)
   - Amount tracking with decimal precision
   - Transaction descriptions and metadata

5. **Pool Fund**: Surplus fund management for client supplies
   - Fund allocation and distribution tracking
   - Client-specific fund entries
   - Transaction linking for audit trails

### API Endpoints
- `/api/clients` - Client management operations
- `/api/properties` - Property listings and management
- `/api/applications` - Application processing and status updates
- `/api/transactions` - Financial transaction tracking
- `/api/pool-fund` - Pool fund operations and balance management
- `/api/dashboard/stats` - Dashboard statistics and metrics

### User Interface
- **Dashboard**: Overview of system metrics and recent activities
- **Client Management**: Add, edit, and view client information
- **Property Management**: Property listings and landlord details
- **Application Processing**: Application status tracking and approvals
- **Financial Management**: Transaction history and reporting
- **Pool Fund**: Fund allocation and distribution interface
- **Mobile Interface**: Responsive design for mobile devices

## Data Flow

1. **Client Onboarding**: Clients are added with complete KYC information
2. **Property Matching**: Available properties are matched with client needs
3. **Application Processing**: Applications are submitted and tracked through approval workflow
4. **Financial Transactions**: Payments, deposits, and reimbursements are recorded
5. **Pool Fund Management**: Surplus funds are allocated for client supplies
6. **Reporting**: System generates reports on all activities and financial flows

## External Dependencies

### Frontend Dependencies
- React ecosystem (React, React DOM, React Hook Form)
- Radix UI component library for accessible UI components
- TanStack Query for server state management
- Tailwind CSS for utility-first styling
- Wouter for lightweight routing
- Zod for runtime type validation

### Backend Dependencies
- Express.js for server framework
- Drizzle ORM for database operations
- Neon serverless PostgreSQL driver
- Session management with connect-pg-simple
- Development tools (tsx, esbuild, Vite)

### Development Tools
- TypeScript for type safety
- ESLint and Prettier for code quality
- Vite for fast development and building
- Drizzle Kit for database migrations

## Deployment Strategy

### Development Environment
- Uses Vite dev server for frontend hot reloading
- Express server with middleware for API routes
- PostgreSQL database with Neon serverless connection
- Real-time development features with Replit integration

### Production Build
- Frontend: Vite builds static assets to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Database: Drizzle migrations ensure schema consistency
- Environment variables for database connection and configuration

### Database Management
- Drizzle ORM provides type-safe database operations
- Schema defined in TypeScript with automatic type generation
- Migration system for database version control
- Connection pooling for optimal performance

## Key Features

### Progressive Web App (PWA) - Mobile Optimized
- **Full PWA Functionality**: Complete progressive web app with offline capabilities, installable on mobile devices
- **Mobile-First Design**: Responsive design optimized for mobile devices with touch-friendly interface
- **Offline Support**: Service worker enables offline functionality with intelligent caching strategies
- **App Installation**: Native app-like installation experience on iOS and Android devices
- **Push Notifications**: Support for push notifications and background sync capabilities
- **Native Features**: Web share API, full-screen mode, and device integration
- **Performance Optimized**: Fast loading with service worker caching and mobile-specific optimizations

### AI Assistant with Chat and Voice
- **Intelligent Property Assistant**: AI-powered assistant that can answer questions about properties, clients, applications, and financial data using OpenAI GPT-4
- **Chat Interface**: Full conversational interface with message history and smart suggestions
- **Voice Capabilities**: 
  - Speech-to-text for voice input using OpenAI Whisper
  - Text-to-speech for audio responses
  - Real-time voice recording with visual feedback
- **Contextual Intelligence**: AI has access to all system data including property details, client information, applications, and financial records
- **Accessible Integration**: Floating assistant button available on all pages (desktop and mobile)
- **Smart Suggestions**: AI provides relevant follow-up questions based on user queries

## Changelog

```
Changelog:
- July 31, 2025. Implemented sites management system with campus categorization (HSWI, LTH, Group Housing, Other), enhanced transaction forms with payment methods (check, ACH, Melio), and active/inactive client status management with proper UI integration and backend API support
- July 30, 2025. Enhanced Financial Management system with comprehensive vendor management, landlord payment tracking, and advanced client financial management tools including bulk operations, payment analytics, and priority action dashboards for complete finance department workflow optimization
- July 18, 2025. Fixed critical pool fund data isolation bug where companies with no clients were seeing global pool fund data instead of $0 balance - implemented proper company-scoped filtering for pool fund entries and balance calculations
- July 18, 2025. Added comprehensive password protection for system admin page with session-based authentication and detailed activity logging for all security events
- July 18, 2025. Created comprehensive activity logs monitoring system with IP address tracking, user agent logging, and detailed audit trails for all user actions throughout the system
- July 18, 2025. Fixed critical multi-tenant security vulnerability by implementing comprehensive company-scoped data isolation for dashboard stats and pool fund APIs - users can now only access their own company's data across all endpoints
- July 18, 2025. Added company name display to dashboard header for clear multi-tenant identification - users can now see which housing program company they're managing
- July 18, 2025. Implemented comprehensive multi-tenant data isolation system with company-specific filtering for all API endpoints (clients, properties, applications, transactions)
- July 18, 2025. Enhanced company creation system with super admin account creation - includes username, email, password fields, automatic Administrator role assignment, and complete transaction-based user creation workflow
- July 18, 2025. Fixed company creation API errors by adding proper username/email uniqueness validation, better error handling, and resolved user_roles constraint issues
- July 18, 2025. Implemented comprehensive county-based pool fund separation system with county-specific API routes, dashboard statistics, and automatic county assignment from client information for accurate financial tracking per county
- July 18, 2025. Added county selection to pool fund forms, county filtering to pool fund page, and fixed client notes authentication to use proper user context instead of hardcoded user IDs
- July 15, 2025. Implemented comprehensive multi-tenant company management system with business registration, KYC documentation, subscription plans, and company-scoped data isolation for clients and properties
- July 15, 2025. Added company approval workflow, statistics tracking, and admin-only company management interface with tabbed view for different company statuses
- July 15, 2025. Created default company for existing data migration and established multi-tenant architecture with foreign key relationships
- July 14, 2025. Added comprehensive data clear functionality with admin button in User Management → Admin tab for secure database clearing while preserving essential admin users and system roles
- July 03, 2025. Implemented comprehensive Progressive Web App (PWA) for mobile interface with offline support, app installation, service worker caching, push notifications, and native mobile features
- July 03, 2025. Added PWA manifest, service worker, app icons, and mobile-optimized UI with network status indicators, share API, and touch-friendly interface
- July 03, 2025. Enhanced AI Assistant with comprehensive system data access including all transactions, housing support records, pool fund entries, and user data for faster, more accurate responses
- July 03, 2025. Optimized AI assistant with intelligent context-aware suggestions based on real-time system statistics and improved confidence scoring algorithms
- July 03, 2025. Successfully implemented comprehensive role-based access control system with permission-based navigation filtering and Maya staff user created with limited access
- July 03, 2025. Added secure logout functionality to header with user information display and role indication
- July 03, 2025. Removed login hints from login page for enhanced security
- July 03, 2025. Created usePermissions hook for granular permission checking and page access control based on user roles
- July 03, 2025. Implemented comprehensive enterprise-level user management and authentication system with role-based access control, granular permissions, audit logging, and super admin capabilities
- July 03, 2025. Added bcryptjs for secure password hashing and comprehensive API routes for authentication, user management, role management, and permission control
- July 03, 2025. Created comprehensive user management frontend with tabbed interface for users, roles, permissions, and audit logs
- July 03, 2025. Successfully initialized system with super admin user and default roles (Administrator, Manager, Staff) with hierarchical permission structure
- July 03, 2025. Optimized AI chat assistant with conversation context understanding and expanded system knowledge
- July 03, 2025. Enhanced dashboard with 7 comprehensive stat cards covering all system modules
- July 03, 2025. Added comprehensive "Other Subsidies" tracking module for non-HS/GRH subsidies
- July 03, 2025. Added comprehensive vendor management system with 19+ healthcare, group home, and service provider organizations
- July 03, 2025. Added AI Assistant with chat and voice capabilities using OpenAI GPT-4, Whisper, and TTS
- July 03, 2025. Fixed critical housing support pool fund calculations to match real-world formula
- July 03, 2025. Enhanced dashboard to count both available and occupied properties as active
- July 03, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
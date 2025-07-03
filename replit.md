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
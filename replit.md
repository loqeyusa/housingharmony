# Housing Program Management System

## Overview
This is a comprehensive Housing Program Management System designed to manage clients, properties, housing applications, financial transactions, and pool fund operations for housing assistance programs. It provides a modern, mobile-responsive web interface and uses a full-stack TypeScript architecture. The system aims to streamline the administration of housing support, ensuring efficient matching of clients to properties, accurate financial tracking, and effective management of communal funds for client supplies. It also incorporates advanced features like an AI assistant and PWA capabilities for enhanced usability and accessibility.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **UI/UX**: Radix UI components with shadcn/ui design system, Tailwind CSS for styling
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM
- **API Pattern**: RESTful API
- **Session Management**: Express sessions with PostgreSQL storage

### Project Structure
- `client/` (Frontend)
- `server/` (Backend)
- `shared/` (Shared types and schema)
- `migrations/` (Database migrations)

### Key Entities & Data Flow
The system manages:
1.  **Clients**: Personal, financial, and KYC data.
2.  **Properties**: Housing unit details and landlord information.
3.  **Applications**: Links clients to properties, tracks payments and status.
4.  **Transactions**: Financial records (payments, reimbursements, fees).
5.  **Pool Fund**: Surplus fund management for client supplies.

Data flows from client onboarding, property matching, application processing, financial transactions, to pool fund management and reporting.

### User Interface
- **Dashboard**: System metrics and activities.
- **Management Modules**: Dedicated interfaces for Clients, Properties, Applications, Financials, and Pool Fund.
- **Mobile Interface**: Responsive design optimized for mobile devices.

### Key Features
- **Progressive Web App (PWA)**: Full PWA functionality including offline support, installable app, push notifications, and performance optimization for mobile devices.
- **AI Assistant**: An intelligent assistant using OpenAI GPT-4, Whisper (speech-to-text), and TTS (text-to-speech) for conversational interaction. It has access to all system data (properties, clients, applications, financials) and provides contextual intelligence and smart suggestions.
- **Multi-tenancy**: Comprehensive company management system with business registration, KYC, and company-scoped data isolation for all core entities (clients, properties, applications, transactions, pool fund, dashboard stats).
- **Role-Based Access Control (RBAC)**: Enterprise-level user management with granular permissions, audit logging, and hierarchical roles (Administrator, Manager, Staff).

## External Dependencies

### Frontend
- React, React DOM, React Hook Form
- Radix UI
- TanStack Query
- Tailwind CSS
- Wouter
- Zod

### Backend
- Express.js
- Drizzle ORM
- Neon (PostgreSQL driver)
- connect-pg-simple (for session management)
- OpenAI API (for AI Assistant)

### Development Tools
- TypeScript
- ESLint, Prettier
- Vite
- Drizzle Kit
- bcryptjs (for password hashing)
```
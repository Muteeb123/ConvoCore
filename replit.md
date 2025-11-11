# CRM Application

## Overview

This is a comprehensive Customer Relationship Management (CRM) application built with a modern full-stack architecture. The application provides functionality for managing leads, customers, opportunities, contacts, tasks, emails, and user management with role-based permissions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session management
- **Password Security**: Crypto module with scrypt for password hashing
- **Session Storage**: PostgreSQL-backed session store

### Database Layer
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with full TypeScript support
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Neon serverless driver with WebSocket support

## Key Components

### Authentication System
- Session-based authentication with Passport.js
- Secure password hashing using scrypt algorithm
- Protected routes with authentication middleware
- User registration and login functionality

### Core Business Entities
- **Users**: System users with role-based permissions
- **Roles**: Configurable permission system
- **Leads**: Potential customers with status tracking
- **Customers**: Converted leads with detailed information
- **Opportunities**: Sales pipeline management
- **Contacts**: Individual contacts associated with customers
- **Tasks**: Todo items with assignments and due dates
- **Meetings**: Calendar events and scheduling
- **Activities**: Audit trail of user actions

### Email Integration
- SMTP/IMAP configuration per user
- Email templates and campaigns
- Email tracking and status management
- Nodemailer integration for sending emails

### Notification System
- In-app notification management
- Task reminders and alerts
- Real-time notification delivery

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Passport.js validates against database
3. Session created and stored in PostgreSQL
4. Protected routes check session validity
5. User context provided throughout application

### CRUD Operations
1. Frontend forms collect user input with Zod validation
2. React Hook Form manages form state and submission
3. TanStack Query handles API requests and caching
4. Express routes process requests with validation
5. Drizzle ORM executes database operations
6. Results cached and UI updated reactively

### Email Workflow
1. User configures email integration settings
2. Email service initializes SMTP transporter
3. Emails composed using templates or custom content
4. Nodemailer sends emails through configured provider
5. Status tracking and delivery confirmation

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: TypeScript ORM for database operations
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React router
- **passport**: Authentication middleware
- **nodemailer**: Email sending capability

### UI Dependencies
- **@radix-ui/***: Headless UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **react-hook-form**: Form management
- **@hookform/resolvers**: Form validation integration

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type safety
- **drizzle-kit**: Database schema management
- **esbuild**: Production bundling

## Deployment Strategy

### Build Process
1. Vite builds the React frontend to `dist/public`
2. esbuild bundles the Express server to `dist/index.js`
3. Database schema applied using Drizzle Kit migrations
4. Environment variables configured for production

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `NODE_ENV`: Environment mode (development/production)

### Production Setup
- Frontend served as static files by Express
- Backend runs on Node.js with production optimizations
- Database connections pooled for efficiency
- Session store persisted in PostgreSQL

The application follows a modern full-stack architecture with clear separation of concerns, type safety throughout, and scalable patterns for future growth.
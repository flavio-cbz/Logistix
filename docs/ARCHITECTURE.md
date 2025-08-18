> **ℹ️ Ce guide a été consolidé. Pour une vue synthétique de la structure, voir le [README.md](../README.md). Ce fichier détaille l’architecture technique complète.**

# Architecture Documentation

This document describes the overall architecture of the LogistiX application.

## Overview

LogistiX is built using a modern web application architecture with Next.js 14, featuring:

- **Frontend**: React 18 with Next.js App Router
- **Backend**: Next.js API Routes
- **Database**: SQLite with Better-SQLite3
- **Authentication**: JWT-based authentication
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: Zustand for client-side state
- **Testing**: Vitest for unit tests, Playwright for E2E tests

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side   │    │    Database     │
│                 │    │                 │    │                 │
│  React Components│◄──►│  API Routes     │◄──►│    SQLite       │
│  Next.js Pages  │    │  Middleware     │    │  Better-SQLite3 │
│  Zustand Store  │    │  Services       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Directory Structure

```
LogistiX/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Protected route group
│   ├── api/v1/            # API endpoints
│   ├── login/             # Authentication pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── features/         # Feature-specific components
│   └── layout/           # Layout components
├── lib/                  # Business logic and utilities
│   ├── services/         # Core services
│   ├── utils/           # Utility functions
│   └── constants/       # Application constants
├── types/               # TypeScript type definitions
├── hooks/               # Custom React hooks
├── data/                # SQLite database
├── docs/                # Documentation
└── tests/               # Test files
```

## Core Components

### 1. Frontend Architecture

#### Pages and Routing
- **App Router**: Uses Next.js 14 App Router for file-based routing
- **Route Groups**: `(dashboard)` group for protected routes
- **Layouts**: Shared layouts for consistent UI structure
- **Loading States**: Built-in loading.tsx files for better UX

#### Component Architecture
```
components/
├── ui/                   # Reusable UI primitives
│   ├── button.tsx
│   ├── input.tsx
│   └── dialog.tsx
├── features/             # Feature-specific components
│   ├── dashboard/
│   ├── parcelles/
│   └── produits/
└── layout/               # Layout components
    ├── header.tsx
    └── sidebar.tsx
```

#### State Management
- **Zustand**: Lightweight state management for client-side state
- **React Hook Form**: Form state management with validation
- **Server State**: Managed through API calls and React Query patterns

### 2. Backend Architecture

#### API Structure
```
api/v1/
├── auth/                 # Authentication endpoints
├── parcelles/           # Parcel management
├── produits/            # Product management
├── market-analysis/     # Market analysis features
└── statistiques/        # Statistics and reporting
```

#### Service Layer
```
lib/services/
├── auth/                # Authentication services
├── database/            # Database services
├── validation/          # Data validation
└── logging/             # Logging and monitoring
```

#### Middleware
- **Authentication**: JWT token validation
- **Request Logging**: Comprehensive request/response logging
- **Error Handling**: Centralized error handling and reporting
- **CORS**: Cross-origin resource sharing configuration

### 3. Database Architecture

#### Schema Design
```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nom TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Parcelles table
CREATE TABLE parcelles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  localisation TEXT,
  taille REAL,
  type TEXT,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Produits table
CREATE TABLE produits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prix REAL NOT NULL,
  quantite INTEGER DEFAULT 0,
  parcelle_id INTEGER,
  user_id INTEGER,
  FOREIGN KEY (parcelle_id) REFERENCES parcelles (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### Database Services
- **Connection Management**: Singleton pattern for database connections
- **Query Optimization**: Prepared statements and indexing
- **Transaction Support**: ACID compliance for data integrity
- **Migration System**: Version-controlled schema changes

### 4. Authentication & Security

#### JWT Authentication
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}
```

#### Security Measures
- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure token generation and validation
- **HTTPS**: SSL/TLS encryption in production
- **Input Validation**: Zod schemas for request validation
- **SQL Injection Prevention**: Prepared statements

### 5. Logging & Monitoring

#### Winston Logging
```typescript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

#### Monitoring Features
- **Request/Response Logging**: All API calls logged
- **Error Tracking**: Comprehensive error logging with stack traces
- **Performance Metrics**: Database query performance monitoring
- **User Activity**: Audit logging for user actions

## Data Flow

### 1. User Request Flow
```
User Action → React Component → API Call → Middleware → Service Layer → Database → Response
```

### 2. Authentication Flow
```
Login Request → Auth Service → Password Validation → JWT Generation → Cookie Setting → Protected Route Access
```

### 3. Data Mutation Flow
```
Form Submission → Validation → API Endpoint → Service Layer → Database Transaction → Response → UI Update
```

## Performance Considerations

### 1. Frontend Optimization
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component with WebP support
- **Bundle Analysis**: Regular bundle size monitoring
- **Caching**: Static asset caching and API response caching

### 2. Backend Optimization
- **Database Indexing**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Prepared statements and query analysis
- **Response Compression**: Gzip compression for API responses

### 3. Database Optimization
- **WAL Mode**: Write-Ahead Logging for better concurrency
- **Pragma Settings**: Optimized SQLite configuration
- **Query Planning**: EXPLAIN QUERY PLAN analysis
- **Backup Strategy**: Regular database backups

## Deployment Architecture

### Development
```
Local Development → SQLite Database → File System Logging
```

### Production
```
Docker Container → SQLite Database → Centralized Logging → Monitoring
```

## Security Architecture

### 1. Authentication Layer
- JWT token-based authentication
- Secure cookie handling
- Session management
- Password security policies

### 2. Authorization Layer
- Role-based access control
- Resource-level permissions
- API endpoint protection
- Data isolation by user

### 3. Data Protection
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

## Scalability Considerations

### Current Limitations
- SQLite single-writer limitation
- File-based database storage
- Single-server deployment

### Future Scalability Options
- PostgreSQL migration for multi-user scenarios
- Redis caching layer
- Horizontal scaling with load balancers
- Microservices architecture for large-scale deployment

## Testing Architecture

### 1. Unit Tests (Vitest)
- Service layer testing
- Utility function testing
- Component testing with React Testing Library

### 2. Integration Tests
- API endpoint testing
- Database integration testing
- Service integration testing

### 3. End-to-End Tests (Playwright)
- User workflow testing
- Cross-browser compatibility
- Performance testing

## Monitoring & Observability

### 1. Application Monitoring
- Error tracking and alerting
- Performance metrics collection
- User activity monitoring
- System health checks

### 2. Database Monitoring
- Query performance tracking
- Connection pool monitoring
- Storage usage tracking
- Backup verification

### 3. Infrastructure Monitoring
- Server resource utilization
- Network performance
- Security event monitoring
- Uptime monitoring
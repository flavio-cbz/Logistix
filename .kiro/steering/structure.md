# LogistiX Project Structure

## Architecture Overview

LogistiX follows a modular Next.js 14 App Router architecture with clear separation of concerns and feature-based organization.

## Root Directory Structure

```
LogistiX/
├── app/                    # Next.js App Router (main application)
├── components/             # Reusable React components
├── lib/                   # Business logic, services, and utilities
├── types/                 # TypeScript type definitions
├── hooks/                 # Custom React hooks
├── scripts/               # Database and maintenance scripts
├── data/                  # SQLite database and uploads
├── docs/                  # Project documentation
├── e2e/                   # End-to-end tests
└── public/                # Static assets
```

## App Directory (Next.js App Router)

```
app/
├── (dashboard)/           # Protected route group
│   ├── dashboard/         # Main dashboard pages
│   ├── parcelles/         # Parcel management
│   ├── produits/          # Product management
│   ├── statistiques/      # Analytics and statistics
│   ├── analyse-marche/    # Market analysis features
│   └── profile/           # User profile management
├── api/v1/               # REST API endpoints
│   ├── auth/             # Authentication endpoints
│   ├── parcelles/        # Parcel CRUD operations
│   ├── produits/         # Product CRUD operations
│   ├── market-analysis/  # Market analysis API
│   └── metadata/         # Vinted metadata sync
├── login/                # Authentication pages
├── features/             # Feature-specific components
├── globals.css           # Global styles
├── layout.tsx            # Root layout component
└── page.tsx              # Home page (redirects to dashboard)
```

## Components Organization

```
components/
├── ui/                   # Base UI components (shadcn/ui)
├── features/             # Feature-specific components
│   ├── dashboard/        # Dashboard widgets and cards
│   ├── parcelles/        # Parcel management components
│   ├── produits/         # Product management components
│   └── market-analysis/  # Market analysis components
├── auth/                 # Authentication components
├── layout/               # Layout components (navigation, sidebar)
└── search/               # Search functionality components
```

## Services & Business Logic

```
lib/
├── services/             # Core business services
│   ├── db.ts            # Database service (SQLite)
│   ├── auth.ts          # Authentication service
│   ├── metadata-service.ts  # Vinted metadata management
│   ├── sync-service.ts  # Data synchronization
│   └── market-analysis/ # Market analysis services
├── utils/               # Utility functions
│   ├── logger.ts        # Winston logging configuration
│   └── validation.ts    # Zod schemas and validation
├── constants/           # Application constants
└── middlewares/         # Custom middleware functions
```

## Key Conventions

### File Naming

- **Components**: PascalCase for component files (`UserProfile.tsx`)
- **Pages**: kebab-case for route segments (`analyse-marche/`)
- **Services**: kebab-case with descriptive names (`metadata-service.ts`)
- **Types**: kebab-case for type definition files (`market-analysis.ts`)

### Import Aliases

```typescript
// Configured in tsconfig.json and components.json
@/components    # components/
@/lib          # lib/
@/hooks        # hooks/
@/types        # types/
@/app          # app/
```

### Database Schema

- **SQLite** database located in `data/logistix.db`
- **Schema initialization** in `lib/services/db.ts`
- **Migrations** handled through `scripts/migrate.js`
- **Metadata schema** for Vinted integration in `lib/services/metadata-schema.sql`

### API Structure

- **RESTful endpoints** under `/api/v1/`
- **Consistent response format** with error handling
- **Authentication middleware** for protected routes
- **Zod validation** for request/response schemas

### Testing Organization

```
├── e2e/                  # Playwright end-to-end tests
├── lib/services/__tests__/  # Service unit tests
└── hooks/__tests__/      # Hook unit tests
```

### Configuration Files

- `next.config.mjs` - Next.js configuration with bundle optimization
- `tailwind.config.ts` - Tailwind CSS with custom design system
- `components.json` - shadcn/ui component configuration
- `vitest.config.ts` - Unit testing configuration
- `playwright.config.ts` - E2E testing configuration

## Development Patterns

### Component Structure

```typescript
// Standard component structure
export interface ComponentProps {
  // Props interface
}

export function Component({ prop }: ComponentProps) {
  // Component implementation
}
```

### Service Pattern

```typescript
// Service classes with singleton pattern
class ServiceName {
  private static instance: ServiceName;
  
  public static getInstance(): ServiceName {
    if (!ServiceName.instance) {
      ServiceName.instance = new ServiceName();
    }
    return ServiceName.instance;
  }
}
```

### API Route Pattern

```typescript
// Consistent API route structure
export async function GET(request: Request) {
  // GET handler
}

export async function POST(request: Request) {
  // POST handler with validation
}
```

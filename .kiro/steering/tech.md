# LogistiX Technology Stack

## Framework & Runtime

- **Next.js 14** with App Router - React framework with server-side rendering
- **Node.js 18+** - JavaScript runtime environment
- **TypeScript** - Static typing for enhanced code quality and developer experience

## Frontend Technologies

- **React 18** - Component-based UI library
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **Framer Motion** - Animation library for smooth interactions
- **Radix UI** - Accessible, unstyled UI components
- **Recharts** - Interactive data visualization library
- **Lucide React** - Modern icon library
- **Next Themes** - Dark/light mode support

## Backend & Database

- **Next.js API Routes** - RESTful API endpoints
- **Better-SQLite3** - Embedded SQL database with WAL mode
- **Drizzle ORM** - Type-safe database operations
- **bcrypt** - Password hashing and authentication
- **Zod** - Runtime type validation and schema parsing

## Development Tools

- **Vitest** - Unit testing framework
- **Playwright** - End-to-end testing
- **ESLint** - Code linting and quality enforcement
- **Bundle Analyzer** - Build optimization analysis

## Deployment & Infrastructure

- **Docker** - Containerization with multi-stage builds
- **Docker Compose** - Local development and production orchestration
- **Redis** - Caching layer for performance optimization

## Common Commands

### Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Testing

```bash
npm run test         # Run unit tests with Vitest
npx playwright test  # Run E2E tests
```

### Database Management

```bash
npm run db:migrate   # Run database migrations
npm run db:backup    # Create database backup
npm run db:restore   # Restore from backup
```

### Performance & Analysis

```bash
npm run build:analyze    # Analyze bundle size
npm run perf:audit      # Lighthouse performance audit
npm run optimize:images # Optimize project images
```

### Docker Operations

```bash
npm run docker:build   # Build Docker image
npm run docker:up      # Start containers
npm run docker:down    # Stop containers
npm run deploy         # Full deployment script
```

## Build System

- **SWC** - Fast TypeScript/JavaScript compiler
- **Webpack** - Module bundler with custom optimizations
- **Bundle splitting** - Automatic code splitting for vendors, UI libraries
- **Image optimization** - Next.js image optimization with WebP/AVIF support

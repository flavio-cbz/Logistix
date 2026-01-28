# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Lint, and Test

- **Development Server**: `npm run dev` (Runs DB init + port check + Next.js dev server)
- **Typecheck & Lint**: `npm run checks` (Runs `tsc` and `eslint`)
- **Unit Tests**: `npm run test:unit`
- **Integration Tests**: `npm run test:integration`
- **E2E Tests**: `npm run test:e2e` (Playwright)
- **Run All Tests**: `npm test`
- **Database Migrations**: `npm run db:generate` (Generate) -> `npm run db:migrate` (Apply)
- **Database Studio**: `npm run db:studio` (Drizzle Studio)
- **Build for Production**: `npm run build`

## Architecture & Structure

Logistix is a Next.js App Router SaaS for e-commerce optimization (China Agent -> Europe Resale).

### Directory Structure
- **`app/`**: Next.js App Router.
  - `(dashboard)/`: Protected UI routes.
  - `api/v1/`: API endpoints.
- **`components/`**: React components.
  - `features/`: Business-specific components (e.g., `produits/`, `parcelles/`).
  - `ui/`: Reusable primitives (Shadcn UI).
- **`lib/`**: Core business logic and infrastructure.
  - **`services/`**: Business logic (Service Layer). **Always** use `serviceContainer` to access services.
  - **`repositories/`**: Data access layer. Encapsulates DB queries.
  - **`database/`**: Drizzle schema (`schema.ts`) and connection logic (`database-service.ts`).
  - **`monitoring/`**: Unified monitoring system.
  - **`market/`**: Vinted analysis and scraping logic.
- **`scripts/`**: Automation scripts (DB init, Superbuy sync, etc.).
- **`drizzle/`**: SQL migrations.

### Key Patterns & Rules

- **Database Access**:
  - **Single Source of Truth**: `lib/database/schema.ts`.
  - **Access Method**: Use **Repositories** (`lib/repositories/*`) combined with the **Unified DB Service** (`lib/database/database-service.ts`).
  - **Services**: All business logic must be in `lib/services/`. Use `serviceContainer` for dependency injection.

- **Business Logic**:
  - Place logic in `lib/services/<domain>-service.ts`.
  - Wire services via `lib/services/container.ts`.
  - Do NOT implement business logic directly in Route Handlers.

- **API & Auth**:
  - **Endpoints**: `app/api/v1/<domain>/route.ts`.
  - **Auth**: Use `requireAuth()` or `optionalAuth()` from `lib/middleware/auth-middleware.ts`.
  - **Validation**: Use Zod schemas (inline or in `lib/schemas/`).
  - **Responses**: Use `createSuccessResponse` / `createErrorResponse` from `lib/utils/api-response.ts`.
  - **Internal Calls**: NEVER use `fetch()` for internal API calls; call the Service layer directly.

- **Integrations**:
  - **Superbuy**: Automation via Playwright in `lib/services/superbuy/automation.ts`. Credentials in `integration_credentials` table.
  - **Market/Vinted**: Logic in `lib/market/`.

- **Logging**:
  - Use `lib/utils/logging/logger.ts` (Server) or `lib/utils/logging/edge-logger.ts` (Edge).
  - **NEVER** use `console.log` in production code.

- **Async & Real-time**:
  - **Jobs**: Use `JobService` (via container) for long tasks. Auto-recovery handles stuck jobs >5min.
  - **SSE**: Frontend subscribes to `/api/v1/sse/events`. Backend emits via `JobService` events.
  - **Patterns**: Create job -> Return ID -> Client listens to SSE -> Worker updates progress.

- **Enrichment (AI)**:
  - **Service**: `ProductEnrichmentService` uses Google Gemini for image analysis.
  - **Mapping**: Enforces Vinted-compatible metadata (brand_id, catalog_id) via strict prompts.

- **Market Integration**:
  - **Vinted**: Uses `VintedClientWrapper` with session cookies.
  - **Sync**: Logic in `lib/services/market/` handles fuzzy matching and status updates (Sold/Reserved).

- **Security**:
  - Never trust client-provided user IDs; derive from session.
  - Secrets are managed in `integration_credentials` table, encrypted via `lib/utils/crypto`.

- **React Hooks**:
  - Custom hooks in `lib/hooks/` (e.g., `useProducts`, `useJobProgress`). Prefix with `use`.

### Development Workflow
1. **UI Changes**: Edit `app/(dashboard)` or `components`.
2. **API Changes**: Modify/Create `app/api/v1/.../route.ts` -> Delegate to `lib/services/...`.
3. **DB Changes**: Edit `lib/database/schema.ts` -> `npm run db:generate` -> `npm run db:migrate`.

## Design System

- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode via `next-themes`).
- **Class Merging**: Use `cn()` from `@/lib/shared/utils` (combines `clsx` + `tailwind-merge`).
- **Icons**: Lucide React (`lucide-react`).
- **Components**: Shadcn/UI (Radix primitives) in `components/ui/`.
- **Colors**: CSS variables in `app/globals.css` (`--background`, `--foreground`, `--primary`, `--muted`, etc.).
- **Animations**: `tailwindcss-animate` + Framer Motion for complex animations.

## TypeScript Guidelines

- **Imports**: Use `@/` alias for absolute imports (e.g., `@/components/ui/button`, `@/lib/services`).
- **Validation**: Zod is mandatory for all external inputs (API, forms).
- **API Responses**: Standardized format via `createSuccessResponse` / `createErrorResponse`.
- **Type Naming**:
  - Prefix database row types with `Db` (e.g., `DbProductRow`).
  - Use `infer` with Drizzle for table types.
- **Strict Mode**: TypeScript strict mode enabled (`tsconfig.json`).

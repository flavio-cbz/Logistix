# LogistiX — AI coding agent instructions (vibe-coding safe)

This repo is **sensitive to “new layers”**. Your job is to extend what exists, not invent a new architecture.
When in doubt, follow patterns already used in `app/api/v1/*`, `lib/services/*`, `lib/repositories/*`, and `lib/database/*`.

## 1) Repo map (where things live)

- UI (Next.js App Router): `app/` (protected UI group: `app/(dashboard)/`, public auth pages: `app/login/`).
- Reusable UI: `components/` (feature components under `features/`, primitives under `ui/`).
- Business + infra: `lib/` (services, repositories, middleware, integrations, monitoring, market).
- DB (SQLite + Drizzle): schema in `lib/database/schema.ts`, migrations in `drizzle/migrations/`, local DB file `data/logistix.db`.
- Automation/scripts: `scripts/` (DB init/migrate/seed; Superbuy headful login/debug; extract flows).
- Tests: `tests/` (Vitest unit/integration + Playwright e2e).

## 2) “Where do I change X?” (decision rules)

- **UI-only change** (layout, component, styling): edit `app/(dashboard)/**` and/or `components/**`.
- **Add/modify an API endpoint**: create/update a Next.js route handler in `app/api/v1/<domain>/.../route.ts`.
- **Business rule / orchestration**: put it in a `lib/services/<something>-service.ts` and wire it via `lib/services/container.ts`.
- **DB access**:
  - Prefer **repositories** (`lib/repositories/*`) + **unified DB** (`lib/database/database-service.ts`).
  - If you must touch existing endpoints using raw SQL, use the legacy bridge `lib/services/database/db.ts` (it delegates to the unified DB, but is marked deprecated).
- **New external integration**: implement under `lib/services/<integration>/` and store credentials in `integration_credentials` (see `lib/database/schema.ts`), encrypted via `encryptSecret`/`decryptSecret` (`lib/utils/crypto`).

## 3) Runtime request/auth flow (do not break)

- UI protection happens at the Edge layer: `middleware.ts`.
  - Protected paths are in `PROTECTED_ROUTES`.
  - Middleware validates sessions by calling **`GET /api/v1/auth/session-check`**.
  - Cookie name comes from config/env (`COOKIE_NAME`, and `lib/config/edge-config.ts`).
- API auth uses `requireAuth()` / `optionalAuth()` from `lib/middleware/auth-middleware.ts`.
  - That middleware reads the current session via `serviceContainer.getAuthService().getSessionUser()`.
- Session validation logic is backed by DB table `user_sessions` (`lib/database/schema.ts`).

## 4) Database model + access conventions (fragility hot-zone)

- **Single source of truth schema**: `lib/database/schema.ts`.
- **Unified DB service**: `DatabaseService` in `lib/database/database-service.ts` (Drizzle + better-sqlite3; fallback mode exists).
- **Legacy DB bridge**: `lib/services/database/db.ts` wraps the unified DB and keeps the old `databaseService.query/queryOne/execute` API.
  - Rule: **do not introduce a third DB wrapper**.
  - If writing new domain logic, prefer `DatabaseService` + repositories.
  - If editing existing “raw SQL” endpoints, keep using the bridge for consistency.

## 5) API route patterns (keep responses consistent)

- Many routes use `withErrorHandling()` from `lib/utils/api-response.ts`.
- For responses, prefer `createSuccessResponse()` / `createErrorResponse()` from `lib/utils/api-response.ts` (already used e.g. auth login).
- Validation is Zod-based:
  - Feature schemas live in `lib/validations/*` (e.g. `lib/validations/product-schemas.ts`).
  - Some endpoints also inline Zod schemas inside the route file.
- Auth in routes: call `requireAuth(req)` early (example patterns in `app/api/v1/parcelles/**` and `app/api/v1/produits/**`).
- Note: there is also `lib/middleware/error-handling.ts` with helpers, but `createApiHandler({ requireAuth: true })` contains a TODO token validation; avoid basing new security-critical routes on that until it’s implemented.

## 6) Logging (don’t spam console, keep secrets safe)

- Server logging: `lib/utils/logging/logger.ts` (structured, masks secrets/tokens, supports context).
- Edge logging (middleware): `lib/utils/logging/edge-logger.ts`.
- Rule: avoid raw `console.log` in app code. Prefer `logger` / `edgeLogger`.

## 7) Key product flows (integration points)

- **Superbuy sync** (Playwright automation): `lib/services/superbuy/automation.ts` + parsers in `lib/services/superbuy/parsers.ts`.
  - Credentials/cookies stored in `integration_credentials` with provider `'superbuy'`.
  - Sync writes to new tables (`parcels`) and also updates legacy table (`parcelles`) for UI compatibility.
  - Product enrichment can happen during sync via `ProductEnrichmentService` using provider `'gemini'` credentials.
- **Market analysis / Vinted**: `lib/market/services/market-analysis-service.ts` → `ProviderFactory` → `lib/market/providers/vinted/*`.

## 8) Dev workflows (use these; don’t invent new ones)

- `npm run dev` runs DB init + port check + `next dev`.
- `npm run checks` runs typecheck (`tsconfig.check.json`) + ESLint (no tests).
- Tests: `npm test`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run test:coverage`.
- DB: `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run db:studio`.

## 9) Environment variables actually used/mentioned

- Auth/cookies: `JWT_SECRET` (warns if missing), `COOKIE_NAME`.
- Logging: `LOG_LEVEL`.
- Middleware: `DEBUG_ROUTES_ENABLED` (blocks `/debug*` in prod unless enabled).
- Superbuy/Gemini/captcha env vars are documented in `docs/ARCHITECTURE_DEEP_DIVE.md` (e.g. `GEMINI_API_KEY`, `GEMINI_MODEL`, captcha tuning flags).

## 10) Negative Constraints (NEVER do this)

These are explicit prohibitions. Violating any of these is a **critical error**.

### Database
- **NEVER** create a new database connection instance manually. Use `DatabaseService` or the legacy bridge `lib/services/database/db.ts`.
- **NEVER** introduce a third DB wrapper or ORM layer.
- **NEVER** write raw SQL outside of repositories without explicit approval.
- **NEVER** modify `lib/database/schema.ts` without checking migration impacts immediately.

### API & Auth
- **NEVER** use standard `fetch()` for internal API calls from the server. Use the service layer (`lib/services/*`).
- **NEVER** skip `requireAuth()` in protected API routes.
- **NEVER** trust client-provided user IDs; always derive from session via `authService.requireAuth()`.
- **NEVER** return raw database errors to the client (wrap in `createErrorResponse`).

### Logging & Secrets
- **NEVER** use `console.log` in production code. Use `logger` from `lib/utils/logging/logger.ts`.
- **NEVER** log sensitive data (tokens, passwords, API keys) directly; the logger masks secrets if you use it correctly.

### Architecture
- **NEVER** add new dependencies without explicit approval.
- **NEVER** create new files in `app/api/` outside of the `v1/` namespace (unless it's `/api/health`).
- **NEVER** bypass the service container by instantiating services directly; use `serviceContainer.get*()`.
- **NEVER** implement business logic directly in route handlers; delegate to services.

### Code Quality
- **NEVER** commit code with TypeScript errors (`npm run checks` must pass).
- **NEVER** guess import paths without verifying the file exists first.
- **NEVER** implement a file based solely on its filename without reading its content.

## 11) Context Engineering Protocol

To combat **context rot** and maintain coherence across long sessions:

### Quick Start
1. **First**: Read `.github/QUICK_REFERENCE.md` (~50 lines, covers 80% of cases)
2. **If unsure**: Follow decision tree in `.context/CONTEXT_PROTOCOL.md`
3. **Track state**: Update `.context/SESSION_STATUS.md` as you work

### Compaction Triggers
Summarize and advise user to reset when:
- Session exceeds **10 turns**
- More than **5 files** read in one session
- You detect contradictions in your own reasoning

### Active References (Not Content)
Maintain pointers instead of loading full files:
```markdown
- Schema: lib/database/schema.ts
- Auth: lib/middleware/auth-middleware.ts
- Current file: app/api/v1/[domain]/route.ts
```

Load content **just-in-time**, only when needed for the immediate next step.

### Related Docs
- `.context/CONTEXT_PROTOCOL.md` — Full protocol details
- `.context/SESSION_STATUS.md` — Active session memory
- `.github/QUICK_REFERENCE.md` — Ultra-compact cheat sheet

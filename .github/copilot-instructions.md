# Copilot Instructions for LogistiX

## Project Architecture & Key Concepts
- **Monorepo structure**: Main app in Next.js (TypeScript), with custom backend logic, SQLite DB, and Docker support.
- **Domain**: Agricultural parcel and product management, with dashboard, analytics, and import/export features.
- **Major folders**:
  - `app/` (Next.js app directory, routes, pages)
  - `components/` (UI, dashboard, widgets, market analysis, etc.)
  - `lib/` (business logic, store, utils, logger, auth)
  - `hooks/` (custom React hooks)
  - `data/` (SQLite DB, admin password, seed data)
  - `scripts/` (migration, backup, restore, test helpers)
  - `public/` (static assets)
  - `styles/` (Tailwind CSS config)

## Developer Workflows
- **Dev server**: `npm run dev` (Next.js, port 3000)
- **Build**: `npm run build` (Next.js)
- **Start (prod)**: `npm start`
- **Docker**: Use `docker-compose.yml` and `deploy.sh` for full-stack deployment. See README for `.env.production`.
- **Testing**: (WIP) Use `npm run test` for available tests. Some scripts in `scripts/` for integration.

## Patterns & Conventions
- **State management**: Zustand store in `lib/store.ts` (parcelles, produits, dashboardConfig, notifications, marketAnalyses). All mutations go through store actions.
- **Widgets**: Dashboard widgets are dynamically loaded and configured via `components/dashboard/WidgetLayoutManager.tsx` and `lib/widget-registry.ts`.
- **SSR/CSR**: Many dashboard/analytics components use `dynamic(..., { ssr: false })` to avoid hydration mismatches (see `app/(dashboard)/dashboard/page.tsx`).
- **No random/Date in SSR**: Never use `Math.random()`, `Date.now()`, `new Date()`, or `crypto.randomUUID()` in SSR-rendered output. Generate such data in `useEffect` or client-only components.
- **Custom hooks**: Hooks that use browser APIs (e.g., `useIsMobile`) must guard with `typeof window !== 'undefined'` or run only in `useEffect`.
- **Styling**: Tailwind CSS with custom color palette in `styles/globals.css` and `tailwind.config.ts`.
- **Import/export**: Data import/export logic is in `components/data-import-export.tsx` and `lib/export/`.
- **Auth/session**: Session managed via cookies, see `lib/auth.ts` and `middleware.ts` for route protection.

## Integration & Data Flow
- **DB**: SQLite, accessed via `lib/db.ts` and scripts in `scripts/`.
- **API**: Next.js API routes in `app/api/`.
- **Admin password**: Stored in `data/admin-password.txt` (change for prod!).
- **Env config**: Use `.env` for dev, `.env.production` for prod. See README for required vars.

## Examples
- To add a new dashboard widget: create a component in `components/dashboard/`, register it in `lib/widget-registry.ts`, and update dashboard config in `lib/store.ts`.
- To add a protected route: add to `middleware.ts` matcher and handle session logic in `lib/auth.ts`.

---

If you are unsure about a pattern, check the README or look for similar usage in `components/`, `lib/`, or `app/`.

> Please suggest improvements to this file if you find missing or outdated conventions.

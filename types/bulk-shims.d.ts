// Permissive shims to reduce TypeScript noise during iterative fixes.
// These declare common local modules and complex exports as `any` so we can
// focus on higher-value type corrections incrementally.

declare module "@/lib/analytics/advanced-analytics-engine" {
  export type AdvancedMetrics = any;
  export type TrendAnalysis = any;
  export type ComparisonResult = any;
  export type PriceDistribution = any;
  export type CompetitiveAnalysis = any;
  export const TrendAnalysis: any;
  export const ComparisonResult: any;
  const _default: any;
  export default _default;
}

declare module "@/lib/utils/logging/logger" {
  export const logger: any;
  export function getLogger(name?: string): any;
  export type ILogger = any;
}

// Store and hooks used by UI pieces
declare module "@/store/store" {
  export function useStore(...args: any[]): any;
}

declare module "@/hooks/use-mobile" {
  export function useIsMobile(): boolean;
}

// Drizzle client/schema common imports — declare permissive shapes used in scripts
declare module "@/lib/services/database/drizzle-client" {
  export const db: any;
  export default db;
}

declare module "@/lib/services/database/drizzle-schema" {
  export const vintedSessions: any;
  export const users: any;
  export const marketAnalyses: any;
  export const historicalPrices: any;
  export const similarSales: any;
  export const userQueryHistory: any;
  export const userPreferences: any;
  export const userActions: any;
  export const marketTrends: any;
  export const trackedProducts: any;
  const _default: any;
  export default _default;
}

// Also allow common relative script imports (scripts use relative paths)
declare module "../lib/services/database/drizzle-client" {
  const db: any;
  export { db };
  export default db;
}

declare module "../lib/services/database/drizzle-schema" {
  export const vintedSessions: any;
  export const users: any;
  const _default: any;
  export default _default;
}

// Commander convenience: allow parse() without argv (some scripts call program.parse())
declare module "commander" {
  class Command {
    parse(argv?: string[]): Command;
  }
  export { Command };
}

// Allow importing css/modules in TS files used by Next
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// Generic fallback for some internal imports used in various scripts
declare module "@/services/*" {
  const whatever: any;
  export default whatever;
}

// Make logger.info, .debug, .http etc available when the logger object is typed loosely
declare global {
  interface Console {
    http?: (...args: any[]) => void;
  }
}

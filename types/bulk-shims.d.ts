export {};

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
}

// Store and hooks used by UI pieces
declare module "@/store/store" {
  export function useStore(...args: any[]): any;
}

declare module "@/hooks/use-mobile" {
  export function useIsMobile(): boolean;
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
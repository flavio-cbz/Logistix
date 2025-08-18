// Global shims to reduce TypeScript noise for missing or complex types
declare module '@/store/store' {
  export function useStore(): any;
}

declare module '@/hooks/use-mobile' {
  export function useIsMobile(): boolean;
}

// Avoid declaring `db` here because the actual module exports `db` and a duplicate declaration
// causes a redeclare error. Use real module types in-place or a more specific shim if needed.



// Commander parse overload convenience
declare module 'commander' {
  interface Command {
    parse(argv?: string[]): Command;
  }
}

// Allow importing .css or other asset types in Next environment
declare module '*.css';

export {};

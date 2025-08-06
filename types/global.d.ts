/**
 * Global Type Definitions
 * Provides type safety across the entire application
 */

// Environment Variables
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly NEXT_PUBLIC_APP_URL: string;
    readonly DATABASE_URL?: string;
    readonly JWT_SECRET: string;
    readonly SENTRY_DSN?: string;
    readonly LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug' | 'silly';
    readonly VINTED_API_URL?: string;
    readonly REDIS_URL?: string;
  }
}

// Global Window Extensions
declare global {
  interface Window {
    // Analytics
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    
    // Development tools
    __REDUX_DEVTOOLS_EXTENSION__?: any;
    __NEXT_DATA__?: any;
    
    // Custom app globals
    APP_CONFIG?: {
      version: string;
      buildTime: string;
      environment: string;
    };
  }

  // Custom JSX elements
  namespace JSX {
    interface IntrinsicElements {
      'custom-element': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

// Module Augmentations
declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.sass' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

// Third-party library augmentations
declare module 'better-sqlite3' {
  interface Database {
    // Add custom methods if needed
    backup?(filename: string): Promise<void>;
    restore?(filename: string): Promise<void>;
  }
}

declare module 'winston' {
  interface Logger {
    // Add custom log methods
    performance?(message: string, meta?: any): void;
    request?(message: string, meta?: any): void;
    database?(message: string, meta?: any): void;
    userAction?(message: string, meta?: any): void;
  }
}

// Utility Types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type ValueOf<T> = T[keyof T];

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  meta: {
    timestamp: string;
    requestId: string;
    version: string;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Database Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletableEntity extends BaseEntity {
  deletedAt?: Date;
}

export interface UserOwnedEntity extends BaseEntity {
  userId: string;
}

// Form Types
export interface FormState<T = any> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  touched: Partial<Record<keyof T, boolean>>;
}

export interface FormField<T = any> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

export interface LoadingProps {
  loading?: boolean;
  loadingText?: string;
}

export interface ErrorProps {
  error?: Error | string | null;
  onRetry?: () => void;
}

export interface AsyncComponentProps extends LoadingProps, ErrorProps {}

// Event Handler Types
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;
export type ChangeHandler<T = any> = (value: T) => void;
export type AsyncChangeHandler<T = any> = (value: T) => Promise<void>;

// Hook Return Types
export interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  handleChange: (field: keyof T) => ChangeHandler;
  handleBlur: (field: keyof T) => EventHandler;
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => EventHandler;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  reset: () => void;
}

// Service Types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CacheOptions {
  ttl?: number;
  key?: string;
  tags?: string[];
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

// Configuration Types
export interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: string;
    url: string;
  };
  database: {
    url: string;
    maxConnections?: number;
    timeout?: number;
  };
  auth: {
    jwtSecret: string;
    tokenExpiry: string;
    refreshTokenExpiry: string;
  };
  logging: {
    level: string;
    transports: string[];
  };
  features: {
    enableAnalytics: boolean;
    enableNotifications: boolean;
    enableCaching: boolean;
  };
}

// Test Types
export interface TestContext {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  database?: {
    cleanup: () => Promise<void>;
    seed: (data: any) => Promise<void>;
  };
}

export interface MockFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mockImplementation: (fn: T) => MockFunction<T>;
  mockReturnValue: (value: ReturnType<T>) => MockFunction<T>;
  mockResolvedValue: (value: Awaited<ReturnType<T>>) => MockFunction<T>;
  mockRejectedValue: (error: any) => MockFunction<T>;
  mockClear: () => void;
  mockReset: () => void;
  mockRestore: () => void;
}

// Export empty object to make this a module
export {};
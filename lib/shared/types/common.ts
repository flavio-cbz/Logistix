/**
 * Shared utility types and common type definitions
 * This file provides reusable TypeScript utility types and common interfaces
 * used across the application.
 */

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make specified properties required in a type
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specified properties optional in a type
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Extract keys of a type that are of a specific type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Create a type with only the specified keys from the original type
 */
export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>;

/**
 * Exclude keys of a type that are of a specific type
 */
export type OmitByType<T, U> = Omit<T, KeysOfType<T, U>>;

/**
 * Make a type deeply partial (all nested properties optional)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make a type deeply required (all nested properties required)
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extract the value type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Create a union of all possible dot-notation paths in an object
 */
export type DotNotation<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends object
    ? `${K}` | `${K}.${DotNotation<T[K]>}`
    : `${K}`
  : never;

/**
 * Get the type of a nested property using dot notation
 */
export type GetByPath<
  T,
  P extends string,
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? GetByPath<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

// ============================================================================
// Common Data Types
// ============================================================================

/**
 * Standard timestamp fields
 */
export interface Timestamps {
  createdAt: string;
  updatedAt?: string;
}

/**
 * Soft delete fields
 */
export interface SoftDelete {
  deletedAt?: string;
  isDeleted?: boolean;
}

/**
 * User ownership fields
 */
export interface UserOwned {
  userId: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Audit trail fields
 */
export interface AuditFields extends Timestamps, UserOwned {
  version?: number;
  lastModifiedBy?: string;
}

/**
 * Base entity interface with common fields
 */
export interface BaseEntity extends Timestamps {
  id: string;
}

/**
 * Entity with user ownership
 */
export interface OwnedEntity extends BaseEntity, UserOwned {}

/**
 * Full auditable entity
 */
export interface AuditableEntity extends BaseEntity, AuditFields {}

// ============================================================================
// Common Value Objects
// ============================================================================

/**
 * Money value object
 */
export interface Money {
  amount: number;
  currency: string;
}

/**
 * Weight value object
 */
export interface Weight {
  value: number;
  unit: "g" | "kg" | "lb" | "oz";
}

/**
 * Dimensions value object
 */
export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: "cm" | "in" | "m";
}

/**
 * Address value object
 */
export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

/**
 * Contact information value object
 */
export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
}

/**
 * Geographic coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ============================================================================
// Common Enums and Constants
// ============================================================================

/**
 * Common sort orders
 */
export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

/**
 * Common date formats
 */
export enum DateFormat {
  ISO = "YYYY-MM-DDTHH:mm:ss.sssZ",
  DATE_ONLY = "YYYY-MM-DD",
  TIME_ONLY = "HH:mm:ss",
  DISPLAY = "DD/MM/YYYY",
  DISPLAY_WITH_TIME = "DD/MM/YYYY HH:mm",
}

/**
 * Common file types
 */
export enum FileType {
  IMAGE = "image",
  DOCUMENT = "document",
  VIDEO = "video",
  AUDIO = "audio",
  ARCHIVE = "archive",
  OTHER = "other",
}

/**
 * Common HTTP status codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

// ============================================================================
// Form and Validation Types
// ============================================================================

/**
 * Form field state
 */
export interface FieldState<T = any> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
}

/**
 * Form state
 */
export interface FormState<
  T extends Record<string, any> = Record<string, any>,
> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  dirty: boolean;
  valid: boolean;
  submitting: boolean;
  submitted: boolean;
}

/**
 * Validation rule
 */
export interface ValidationRule<T = any> {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | undefined;
  message?: string;
}

/**
 * Field configuration
 */
export interface FieldConfig<T = any> {
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "select"
    | "checkbox"
    | "textarea"
    | "file";
  label: string;
  placeholder?: string;
  defaultValue?: T;
  options?: Array<{ value: any; label: string }>;
  validation?: ValidationRule<T>;
  disabled?: boolean;
  readonly?: boolean;
}

// ============================================================================
// Loading and Error States
// ============================================================================

/**
 * Loading state
 */
export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
}

/**
 * Error state
 */
export interface ErrorState {
  error: string | null;
  errorCode?: string;
  errorDetails?: any;
}

/**
 * Async operation state
 */
export interface AsyncState<T = any> extends LoadingState, ErrorState {
  data: T | null;
  lastFetch?: string;
}

/**
 * Resource state for CRUD operations
 */
export interface ResourceState<T = any> extends AsyncState<T[]> {
  selected: T | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

// ============================================================================
// Event and Callback Types
// ============================================================================

/**
 * Generic event handler
 */
export type EventHandler<T = any> = (event: T) => void;

/**
 * Async event handler
 */
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;

/**
 * Change handler for form inputs
 */
export type ChangeHandler<T = any> = (value: T) => void;

/**
 * Submit handler for forms
 */
export type SubmitHandler<T = any> = (values: T) => void | Promise<void>;

/**
 * Click handler
 */
export type ClickHandler = (event: MouseEvent) => void;

/**
 * Key handler
 */
export type KeyHandler = (event: KeyboardEvent) => void;

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Feature flag configuration
 */
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  conditions?: Record<string, any>;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}

/**
 * Application configuration
 */
export interface AppConfig {
  name: string;
  version: string;
  environment: "development" | "staging" | "production";
  apiUrl: string;
  features: FeatureFlag[];
  theme: ThemeConfig;
  locale: string;
  timezone: string;
}

// ============================================================================
// Search and Filter Types
// ============================================================================

/**
 * Filter operator
 */
export enum FilterOperator {
  EQUALS = "eq",
  NOT_EQUALS = "ne",
  GREATER_THAN = "gt",
  GREATER_THAN_OR_EQUAL = "gte",
  LESS_THAN = "lt",
  LESS_THAN_OR_EQUAL = "lte",
  CONTAINS = "contains",
  STARTS_WITH = "startsWith",
  ENDS_WITH = "endsWith",
  IN = "in",
  NOT_IN = "notIn",
  IS_NULL = "isNull",
  IS_NOT_NULL = "isNotNull",
}

/**
 * Filter condition
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

/**
 * Sort condition
 */
export interface SortCondition {
  field: string;
  order: SortOrder;
}

/**
 * Query parameters for list endpoints
 */
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  filters?: FilterCondition[];
  sort?: SortCondition[];
}

// ============================================================================
// Type Guards and Validators
// ============================================================================

/**
 * Type guard to check if a value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Type guard to check if a value is a string
 */
export function isString(value: any): value is string {
  return typeof value === "string";
}

/**
 * Type guard to check if a value is a number
 */
export function isNumber(value: any): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === "boolean";
}

/**
 * Type guard to check if a value is an object
 */
export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Type guard to check if a value is an array
 */
export function isArray<T>(value: any): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is a function
 */
export function isFunction(value: any): value is Function {
  return typeof value === "function";
}

/**
 * Type guard to check if a value is a valid date
 */
export function isValidDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Type guard to check if a string is a valid UUID
 */
export function isUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Type guard to check if a string is a valid email
 */
export function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}
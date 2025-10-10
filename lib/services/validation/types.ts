export interface ValidationReport {
  timestamp: string;
  overallSuccess: boolean;
  tokenValidation: TokenValidationResult;
  productTests: ProductTestResult[];
  deletionTest: DeletionValidationResult;
  databaseIntegrity: IntegrityResult;
  recommendations: string[];
  debugInfo?: DebugReport;
}

export interface TokenValidationResult {
  isValid: boolean;
  expiresAt?: Date;
  scopes: string[];
  errors: string[];
}

export interface ProductTestResult {
  productName: string;
  success: boolean;
  actualPriceRange: PriceRange;
  expectedPriceRange: PriceRange;
  analysisTime: number;
  errors: string[];
  taskId: string;
}

export interface DeletionValidationResult {
  success: boolean;
  taskId: string;
  preDeletionState: PreDeletionState;
  postDeletionState: IntegrityResult;
  errors: string[];
}

export interface IntegrityResult {
  taskRemoved: boolean;
  noOrphanedData: boolean;
  databaseConsistent: boolean;
  errors: string[];
}

export interface DebugReport {
  timestamp: string;
  apiCalls: any[]; // Replace with specific type if available
  databaseOperations: any[]; // Replace with specific type if available
  calculations: any[]; // Replace with specific type if available
  errors: any[]; // Replace with specific type if available
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

export interface PreDeletionState {
  taskExists: boolean;
  relatedDataCount: number;
  databaseState: any; // Replace with specific type for database snapshot
}

export interface TestConfiguration {
  vintedApiToken: string;
  testProducts: ProductTestCase[];
  debugMode: boolean;
  timeoutSettings: TimeoutSettings;
}

export interface TimeoutSettings {
  apiCallTimeout: number;
  analysisTimeout: number;
  pollingInterval: number;
  maxRetries: number;
}

export interface ValidationResult {
  tokenValid: boolean;
  apiConnectionEstablished: boolean;
  errors: string[];
}

export interface ProductTestCase {
  name: string;
  expectedPriceRange: PriceRange;
  description: string;
}

export interface CompletionStatus {
  isComplete: boolean;
  progress: number;
  status: string;
  error?: string;
}

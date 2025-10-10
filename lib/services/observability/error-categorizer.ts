/**
 * Minimal stub Error Categorizer (original implementation removed for stabilization)
 */

export type ErrorCategory = string;
export type ErrorSubCategory = string;
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CategorizedError {
  category: ErrorCategory;
  subCategory: ErrorSubCategory;
  severity: ErrorSeverity;
  message: string;
  timestamp: string;
  recoverable: boolean;
  stack?: string | undefined;
}

export interface ErrorCategorizerConfig { enabled: boolean }

export class ErrorCategorizerService {
  private config: ErrorCategorizerConfig = { enabled: false };

  categorize(error: unknown): CategorizedError {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      category: 'unknown',
      subCategory: 'uncategorized',
      severity: 'medium',
      message: err.message,
      timestamp: new Date().toISOString(),
      recoverable: false,
      stack: err.stack,
    };
  }

  updateConfig(cfg: Partial<ErrorCategorizerConfig>): void {
    this.config = { ...this.config, ...cfg };
  }

  getConfig(): ErrorCategorizerConfig {
    return { ...this.config };
  }
}

export const errorCategorizer = new ErrorCategorizerService();

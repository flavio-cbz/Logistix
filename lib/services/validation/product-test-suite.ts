/**
 * Product Test Suite Service - DISABLED
 * Market analysis functionality temporarily disabled
 */

import { 
  ProductTestCase, 
  ProductTestResult, 
  PriceRange, 
  CompletionStatus,
  TimeoutSettings 
} from './types';
import { DEFAULT_TIMEOUT_SETTINGS } from '@/lib/constants/config';

/**
 * Product Test Suite class - DISABLED
 */
export class ProductTestSuite {
  private timeoutSettings: TimeoutSettings;
  private debugMode: boolean;

  constructor(timeoutSettings: TimeoutSettings = DEFAULT_TIMEOUT_SETTINGS, debugMode: boolean = false) {
    this.timeoutSettings = timeoutSettings;
    this.debugMode = debugMode;
  }

  /**
   * Test a specific product - DISABLED
   */
  async testProduct(productName: string, expectedPriceRange: PriceRange): Promise<ProductTestResult> {
    return {
      productName,
      success: false,
      actualPriceRange: {
        min: 0,
        max: 0,
        currency: expectedPriceRange.currency
      },
      expectedPriceRange,
      analysisTime: 0,
      errors: ['Service temporairement désactivé'],
      taskId: ''
    };
  }

  /**
   * Test multiple products - DISABLED
   */
  async testMultipleProducts(testCases: ProductTestCase[]): Promise<ProductTestResult[]> {
    return testCases.map(testCase => ({
      productName: testCase.name,
      success: false,
      actualPriceRange: {
        min: 0,
        max: 0,
        currency: testCase.expectedPriceRange.currency
      },
      expectedPriceRange: testCase.expectedPriceRange,
      analysisTime: 0,
      errors: ['Service temporairement désactivé'],
      taskId: ''
    }));
  }

  /**
   * Check analysis completion - DISABLED
   */
  async checkAnalysisCompletion(taskId: string): Promise<CompletionStatus> {
    return {
      isComplete: false,
      progress: 0,
      status: 'failed',
      error: 'Service temporairement désactivé'
    };
  }

  /**
   * Update timeout settings
   */
  setTimeoutSettings(settings: TimeoutSettings): void {
    this.timeoutSettings = settings;
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): { timeoutSettings: TimeoutSettings; debugMode: boolean } {
    return {
      timeoutSettings: this.timeoutSettings,
      debugMode: this.debugMode
    };
  }
}

/**
 * Singleton instance for global access
 */
export const productTestSuite = new ProductTestSuite();
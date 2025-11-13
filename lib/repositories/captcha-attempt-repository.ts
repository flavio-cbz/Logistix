/**
 * CaptchaAttemptRepository Interface
 * Defines data access operations for captcha attempts
 */

import type { CaptchaAttempt } from '@/lib/domain/entities/captcha-attempt';
import type { CaptchaStatus } from '@/lib/domain/entities/captcha-attempt';

export interface CaptchaAttemptRepository {
  /**
   * Create a new captcha attempt
   */
  create(attempt: CaptchaAttempt): Promise<CaptchaAttempt>;

  /**
   * Find attempt by ID
   */
  findById(id: string): Promise<CaptchaAttempt | null>;

  /**
   * Find attempts by user ID
   */
  findByUserId(userId: string, limit?: number): Promise<CaptchaAttempt[]>;

  /**
   * Find attempts by status
   */
  findByStatus(status: CaptchaStatus, limit?: number): Promise<CaptchaAttempt[]>;

  /**
   * Update an attempt
   */
  update(attempt: CaptchaAttempt): Promise<CaptchaAttempt>;

  /**
   * Get success rate for a user
   */
  getSuccessRate(userId: string): Promise<number>;

  /**
   * Get recent attempts with pagination
   */
  findRecent(limit: number, offset: number): Promise<CaptchaAttempt[]>;

  /**
   * Delete attempt by ID
   */
  delete(id: string): Promise<void>;
}

/**
 * TrainingDataRepository Interface
 * Defines data access operations for training data
 */

import type { TrainingData } from '@/lib/domain/entities/training-data';
import type { AnnotationSource } from '@/lib/domain/entities/training-data';

export interface TrainingDataRepository {
  /**
   * Create new training data
   */
  create(data: TrainingData): Promise<TrainingData>;

  /**
   * Find training data by ID
   */
  findById(id: string): Promise<TrainingData | null>;

  /**
   * Find training data by attempt ID
   */
  findByAttemptId(attemptId: string): Promise<TrainingData | null>;

  /**
   * Find validated training data for model training
   */
  findValidated(limit?: number): Promise<TrainingData[]>;

  /**
   * Find unvalidated training data needing review
   */
  findUnvalidated(limit?: number): Promise<TrainingData[]>;

  /**
   * Find by annotation source
   */
  findBySource(source: AnnotationSource, limit?: number): Promise<TrainingData[]>;

  /**
   * Update training data
   */
  update(data: TrainingData): Promise<TrainingData>;

  /**
   * Get total count of training samples
   */
  count(): Promise<number>;

  /**
   * Get count of validated training samples
   */
  countValidated(): Promise<number>;

  /**
   * Delete training data by ID
   */
  delete(id: string): Promise<void>;
}

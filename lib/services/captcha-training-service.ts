/**
 * CaptchaTrainingService
 * Handles continuous learning and model retraining
 */

import { nanoid } from 'nanoid';
import type { TrainingDataRepository } from '@/lib/repositories/training-data-repository';
import type { CaptchaAttemptRepository } from '@/lib/repositories/captcha-attempt-repository';
import { TrainingData } from '@/lib/domain/entities/training-data';
import { db } from '@/lib/database/db';
import { modelMetrics } from '@/lib/database/schema';

export interface TrainingStats {
  totalSamples: number;
  validatedSamples: number;
  unvalidatedSamples: number;
  manualAnnotations: number;
  automaticAnnotations: number;
  successRate: number;
  averageError: number;
}

export interface ModelPerformance {
  modelVersion: string;
  successRate: number;
  averageConfidence: number;
  averageError: number;
  totalAttempts: number;
  successfulAttempts: number;
  recordedAt: string;
}

export interface ManualAnnotation {
  attemptId: string;
  gapPosition: number;
  annotatedBy: string;
}

export class CaptchaTrainingService {
  constructor(
    private readonly trainingDataRepository: TrainingDataRepository,
    private readonly attemptRepository: CaptchaAttemptRepository,
  ) {}

  /**
   * Manually annotate a captcha for training
   */
  async annotateManually(annotation: ManualAnnotation): Promise<TrainingData> {
    const attempt = await this.attemptRepository.findById(annotation.attemptId);
    if (!attempt) {
      throw new Error(`Attempt ${annotation.attemptId} not found`);
    }

    // Check if training data already exists
    const existing = await this.trainingDataRepository.findByAttemptId(annotation.attemptId);
    
    if (existing) {
      // Update existing annotation
      const updated = existing.updateGapPosition(
        annotation.gapPosition,
        annotation.annotatedBy,
      );
      return await this.trainingDataRepository.update(updated);
    }

    // Create new training data
    const trainingData = new TrainingData({
      id: nanoid(),
      attemptId: annotation.attemptId,
      imageUrl: attempt.imageUrl,
      puzzlePieceUrl: attempt.puzzlePieceUrl ?? undefined,
      gapPosition: annotation.gapPosition,
      annotationSource: 'manual',
      annotatedBy: annotation.annotatedBy,
      annotatedAt: new Date().toISOString(),
      isValidated: true,
      metadata: {
        originalDetectedPosition: attempt.detectedPosition,
        originalConfidence: attempt.confidence,
      },
    });

    return await this.trainingDataRepository.create(trainingData);
  }

  /**
   * Validate automatic annotation
   */
  async validateAnnotation(trainingDataId: string, validatedBy: string): Promise<TrainingData> {
    const trainingData = await this.trainingDataRepository.findById(trainingDataId);
    if (!trainingData) {
      throw new Error(`Training data ${trainingDataId} not found`);
    }

    const validated = trainingData.validate(validatedBy);
    return await this.trainingDataRepository.update(validated);
  }

  /**
   * Get training statistics
   */
  async getTrainingStats(): Promise<TrainingStats> {
    const totalSamples = await this.trainingDataRepository.count();
    const validatedSamples = await this.trainingDataRepository.countValidated();
    const unvalidatedSamples = totalSamples - validatedSamples;

    const manualData = await this.trainingDataRepository.findBySource('manual');
    const automaticData = await this.trainingDataRepository.findBySource('automatic');

    // Calculate success rate from recent attempts
    const recentAttempts = await this.attemptRepository.findRecent(100, 0);
    const successfulAttempts = recentAttempts.filter((a) => a.status === 'success').length;
    const successRate = recentAttempts.length > 0 
      ? (successfulAttempts / recentAttempts.length) * 100 
      : 0;

    // Calculate average error
    const attemptsWithError = recentAttempts.filter(
      (a) => a.actualPosition !== undefined && a.status === 'success',
    );
    const averageError = attemptsWithError.length > 0
      ? attemptsWithError.reduce((sum, a) => {
          const error = Math.abs(a.detectedPosition - (a.actualPosition ?? 0));
          return sum + error;
        }, 0) / attemptsWithError.length
      : 0;

    return {
      totalSamples,
      validatedSamples,
      unvalidatedSamples,
      manualAnnotations: manualData.length,
      automaticAnnotations: automaticData.length,
      successRate,
      averageError,
    };
  }

  /**
   * Get unvalidated training data needing review
   */
  async getUnvalidatedData(limit: number = 20): Promise<TrainingData[]> {
    return await this.trainingDataRepository.findUnvalidated(limit);
  }

  /**
   * Get validated training data for model training
   */
  async getValidatedData(limit?: number): Promise<TrainingData[]> {
    return await this.trainingDataRepository.findValidated(limit);
  }

  /**
   * Record model performance metrics
   */
  async recordModelPerformance(
    modelVersion: string,
    performance: Omit<ModelPerformance, 'modelVersion' | 'recordedAt'>,
  ): Promise<void> {
    await db.insert(modelMetrics).values({
      id: nanoid(),
      modelVersion,
      successRate: performance.successRate,
      averageConfidence: performance.averageConfidence,
      averageError: performance.averageError,
      totalAttempts: performance.totalAttempts,
      successfulAttempts: performance.successfulAttempts,
      recordedAt: new Date().toISOString(),
    });
  }

  /**
   * Get model performance history
   */
  async getModelPerformanceHistory(limit: number = 10): Promise<ModelPerformance[]> {
    const results = await db
      .select()
      .from(modelMetrics)
      .orderBy(modelMetrics.recordedAt)
      .limit(limit);

    return results.map((r: typeof modelMetrics.$inferSelect) => ({
      modelVersion: r.modelVersion,
      successRate: r.successRate,
      averageConfidence: r.averageConfidence,
      averageError: r.averageError,
      totalAttempts: r.totalAttempts,
      successfulAttempts: r.successfulAttempts,
      recordedAt: r.recordedAt,
    }));
  }

  /**
   * Prepare training batch
   * Returns validated training data ready for model retraining
   */
  async prepareTrainingBatch(minSamples: number = 100): Promise<{
    ready: boolean;
    samples: TrainingData[];
    message: string;
  }> {
    const validatedData = await this.getValidatedData();

    if (validatedData.length < minSamples) {
      return {
        ready: false,
        samples: [],
        message: `Insufficient training samples. Need ${minSamples}, have ${validatedData.length}.`,
      };
    }

    return {
      ready: true,
      samples: validatedData,
      message: `Training batch ready with ${validatedData.length} samples.`,
    };
  }
}

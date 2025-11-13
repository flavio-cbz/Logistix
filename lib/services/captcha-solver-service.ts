/**
 * CaptchaSolverService
 * Core service for solving slider captchas using YOLO detection
 */

import { nanoid } from 'nanoid';
import type { CaptchaAttemptRepository } from '@/lib/repositories/captcha-attempt-repository';
import type { TrainingDataRepository } from '@/lib/repositories/training-data-repository';
import { CaptchaAttempt } from '@/lib/domain/entities/captcha-attempt';
import { TrainingData } from '@/lib/domain/entities/training-data';

export interface CaptchaSolveRequest {
  userId: string;
  imageUrl: string;
  puzzlePieceUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CaptchaSolveResult {
  attemptId: string;
  detectedPosition: number;
  confidence: number;
  status: 'pending' | 'success' | 'failure';
  message?: string;
}

export interface YOLODetectionResult {
  position: number;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Interface for YOLO model integration
 * To be implemented with actual YOLO model
 */
export interface YOLODetector {
  detect(imageUrl: string): Promise<YOLODetectionResult>;
}

export class CaptchaSolverService {
  constructor(
    private readonly attemptRepository: CaptchaAttemptRepository,
    private readonly trainingDataRepository: TrainingDataRepository,
    private readonly yoloDetector?: YOLODetector,
  ) {}

  /**
   * Solve a slider captcha
   */
  async solveCaptcha(request: CaptchaSolveRequest): Promise<CaptchaSolveResult> {
    try {
      // Detect gap position using YOLO or fallback
      const detection = await this.detectGapPosition(request.imageUrl);

      // Create attempt record
      const attempt = new CaptchaAttempt({
        id: nanoid(),
        userId: request.userId,
        imageUrl: request.imageUrl,
        puzzlePieceUrl: request.puzzlePieceUrl ?? undefined,
        detectedPosition: detection.position,
        confidence: detection.confidence,
        status: 'pending',
        attemptedAt: new Date().toISOString(),
        metadata: request.metadata ?? undefined,
        actualPosition: undefined,
        solvedAt: undefined,
        errorMessage: undefined,
      });

      await this.attemptRepository.create(attempt);

      return {
        attemptId: attempt.id,
        detectedPosition: detection.position,
        confidence: detection.confidence,
        status: 'pending',
        message: 'Captcha position detected. Waiting for validation.',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Create failed attempt
      const failedAttempt = new CaptchaAttempt({
        id: nanoid(),
        userId: request.userId,
        imageUrl: request.imageUrl,
        puzzlePieceUrl: request.puzzlePieceUrl ?? undefined,
        detectedPosition: 0,
        confidence: 0,
        status: 'failure',
        attemptedAt: new Date().toISOString(),
        errorMessage,
        metadata: request.metadata ?? undefined,
        actualPosition: undefined,
        solvedAt: undefined,
      });

      await this.attemptRepository.create(failedAttempt);

      return {
        attemptId: failedAttempt.id,
        detectedPosition: 0,
        confidence: 0,
        status: 'failure',
        message: errorMessage,
      };
    }
  }

  /**
   * Validate and record captcha result
   */
  async validateResult(
    attemptId: string,
    success: boolean,
    actualPosition?: number,
  ): Promise<void> {
    const attempt = await this.attemptRepository.findById(attemptId);
    if (!attempt) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    let updatedAttempt: CaptchaAttempt;
    if (success && actualPosition !== undefined) {
      updatedAttempt = attempt.markAsSuccess(actualPosition);
      
      // Add to training data if successful
      await this.addToTrainingData(attempt, actualPosition);
    } else {
      updatedAttempt = attempt.markAsFailed('Captcha validation failed');
    }

    await this.attemptRepository.update(updatedAttempt);
  }

  /**
   * Add successful attempt to training data
   */
  private async addToTrainingData(
    attempt: CaptchaAttempt,
    actualPosition: number,
  ): Promise<void> {
    const trainingData = new TrainingData({
      id: nanoid(),
      attemptId: attempt.id,
      imageUrl: attempt.imageUrl,
      puzzlePieceUrl: attempt.puzzlePieceUrl ?? undefined,
      gapPosition: actualPosition,
      annotationSource: 'automatic',
      annotatedAt: new Date().toISOString(),
      isValidated: false,
      annotatedBy: undefined,
      metadata: {
        detectedPosition: attempt.detectedPosition,
        confidence: attempt.confidence,
        error: Math.abs(attempt.detectedPosition - actualPosition),
      },
    });

    await this.trainingDataRepository.create(trainingData);
  }

  /**
   * Detect gap position in captcha image
   */
  private async detectGapPosition(imageUrl: string): Promise<YOLODetectionResult> {
    if (this.yoloDetector) {
      return await this.yoloDetector.detect(imageUrl);
    }

    // Fallback: Return mock detection for testing
    // In production, this should throw an error if no detector is available
    return {
      position: Math.random() * 300, // Random position for testing
      confidence: 0.5,
    };
  }

  /**
   * Get success rate for a user
   */
  async getUserSuccessRate(userId: string): Promise<number> {
    return await this.attemptRepository.getSuccessRate(userId);
  }

  /**
   * Get recent attempts
   */
  async getRecentAttempts(limit: number = 10, offset: number = 0): Promise<CaptchaAttempt[]> {
    return await this.attemptRepository.findRecent(limit, offset);
  }

  /**
   * Get user attempts
   */
  async getUserAttempts(userId: string, limit: number = 10): Promise<CaptchaAttempt[]> {
    return await this.attemptRepository.findByUserId(userId, limit);
  }
}

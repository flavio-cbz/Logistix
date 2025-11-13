/**
 * AnnotateCaptchaUseCase
 * Application layer use case for manual captcha annotation
 */

import type { CaptchaTrainingService, ManualAnnotation } from '@/lib/services/captcha-training-service';
import type { TrainingData } from '@/lib/domain/entities/training-data';

export class AnnotateCaptchaUseCase {
  constructor(private readonly trainingService: CaptchaTrainingService) {}

  async execute(annotation: ManualAnnotation): Promise<TrainingData> {
    // Validate request
    if (!annotation.attemptId) {
      throw new Error('Attempt ID is required');
    }

    if (annotation.gapPosition === undefined || annotation.gapPosition < 0) {
      throw new Error('Valid gap position is required');
    }

    if (!annotation.annotatedBy) {
      throw new Error('Annotator identifier is required');
    }

    // Create or update annotation
    return await this.trainingService.annotateManually(annotation);
  }
}

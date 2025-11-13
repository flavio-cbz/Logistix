/**
 * GetTrainingStatsUseCase
 * Application layer use case for retrieving training statistics
 */

import type { CaptchaTrainingService, TrainingStats } from '@/lib/services/captcha-training-service';

export class GetTrainingStatsUseCase {
  constructor(private readonly trainingService: CaptchaTrainingService) {}

  async execute(): Promise<TrainingStats> {
    return await this.trainingService.getTrainingStats();
  }
}

/**
 * ValidateCaptchaResultUseCase
 * Application layer use case for validating captcha results
 */

import type { CaptchaSolverService } from '@/lib/services/captcha-solver-service';

export interface ValidateCaptchaRequest {
  attemptId: string;
  success: boolean;
  actualPosition?: number;
}

export class ValidateCaptchaResultUseCase {
  constructor(private readonly captchaSolverService: CaptchaSolverService) {}

  async execute(request: ValidateCaptchaRequest): Promise<void> {
    // Validate request
    if (!request.attemptId) {
      throw new Error('Attempt ID is required');
    }

    if (request.success && request.actualPosition === undefined) {
      throw new Error('Actual position is required for successful validation');
    }

    // Validate result
    await this.captchaSolverService.validateResult(
      request.attemptId,
      request.success,
      request.actualPosition,
    );
  }
}

/**
 * SolveCaptchaUseCase
 * Application layer use case for solving captchas
 */

import type { CaptchaSolverService } from '@/lib/services/captcha-solver-service';
import type { CaptchaSolveRequest, CaptchaSolveResult } from '@/lib/services/captcha-solver-service';

export class SolveCaptchaUseCase {
  constructor(private readonly captchaSolverService: CaptchaSolverService) {}

  async execute(request: CaptchaSolveRequest): Promise<CaptchaSolveResult> {
    // Validate request
    if (!request.userId) {
      throw new Error('User ID is required');
    }

    if (!request.imageUrl) {
      throw new Error('Image URL is required');
    }

    // Solve captcha
    return await this.captchaSolverService.solveCaptcha(request);
  }
}

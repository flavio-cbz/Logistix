import { NextRequest, NextResponse } from 'next/server';
import { serviceContainer } from '@/lib/services/container';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { ValidateCaptchaResultUseCase } from '@/lib/application/use-cases/validate-captcha-result.use-case';

async function validateCaptchaHandler(req: NextRequest): Promise<NextResponse> {
  await requireAuth(req);

  const body = await req.json();
  const { attemptId, success, actualPosition } = body;

  const captchaSolverService = serviceContainer.getCaptchaSolverService();
  const useCase = new ValidateCaptchaResultUseCase(captchaSolverService);

  await useCase.execute({
    attemptId,
    success,
    actualPosition,
  });

  const response = createSuccessResponse({ message: 'Captcha result validated successfully' });
  return NextResponse.json(response);
}

export const POST = withErrorHandling(validateCaptchaHandler);

import { NextRequest, NextResponse } from 'next/server';
import { serviceContainer } from '@/lib/services/container';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { AnnotateCaptchaUseCase } from '@/lib/application/use-cases/annotate-captcha.use-case';

async function annotateCaptchaHandler(req: NextRequest): Promise<NextResponse> {
  const { user } = await requireAuth(req);

  const body = await req.json();
  const { attemptId, gapPosition } = body;

  const trainingService = serviceContainer.getCaptchaTrainingService();
  const useCase = new AnnotateCaptchaUseCase(trainingService);

  const trainingData = await useCase.execute({
    attemptId,
    gapPosition,
    annotatedBy: user.id,
  });

  const response = createSuccessResponse({ trainingData: trainingData.toJSON() });
  return NextResponse.json(response);
}

export const POST = withErrorHandling(annotateCaptchaHandler);

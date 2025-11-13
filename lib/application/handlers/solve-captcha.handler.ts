import { NextRequest, NextResponse } from 'next/server';
import { serviceContainer } from '@/lib/services/container';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { SolveCaptchaUseCase } from '@/lib/application/use-cases/solve-captcha.use-case';

async function solveCaptchaHandler(req: NextRequest): Promise<NextResponse> {
  const { user } = await requireAuth(req);

  const body = await req.json();
  const { imageUrl, puzzlePieceUrl, metadata } = body;

  const captchaSolverService = serviceContainer.getCaptchaSolverService();
  const useCase = new SolveCaptchaUseCase(captchaSolverService);

  const result = await useCase.execute({
    userId: user.id,
    imageUrl,
    puzzlePieceUrl,
    metadata,
  });

  const response = createSuccessResponse(result);
  return NextResponse.json(response);
}

export const POST = withErrorHandling(solveCaptchaHandler);

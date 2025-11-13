import { NextRequest, NextResponse } from 'next/server';
import { serviceContainer } from '@/lib/services/container';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { GetTrainingStatsUseCase } from '@/lib/application/use-cases/get-training-stats.use-case';

async function getTrainingStatsHandler(req: NextRequest): Promise<NextResponse> {
  await requireAuth(req);

  const trainingService = serviceContainer.getCaptchaTrainingService();
  const useCase = new GetTrainingStatsUseCase(trainingService);

  const stats = await useCase.execute();

  const response = createSuccessResponse(stats);
  return NextResponse.json(response);
}

export const GET = withErrorHandling(getTrainingStatsHandler);

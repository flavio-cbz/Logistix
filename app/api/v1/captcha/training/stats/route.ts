import { NextRequest } from 'next/server';
import { GET as handleGetTrainingStats } from '@/lib/application/handlers/get-training-stats.handler';

export async function GET(request: NextRequest) {
  return handleGetTrainingStats(request);
}

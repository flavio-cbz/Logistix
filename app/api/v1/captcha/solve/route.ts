import { NextRequest } from 'next/server';
import { POST as handleSolveCaptcha } from '@/lib/application/handlers/solve-captcha.handler';

export async function POST(request: NextRequest) {
  return handleSolveCaptcha(request);
}

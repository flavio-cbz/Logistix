import { NextRequest } from 'next/server';
import { POST as handleValidateCaptcha } from '@/lib/application/handlers/validate-captcha.handler';

export async function POST(request: NextRequest) {
  return handleValidateCaptcha(request);
}

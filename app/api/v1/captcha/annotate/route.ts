import { NextRequest } from 'next/server';
import { POST as handleAnnotateCaptcha } from '@/lib/application/handlers/annotate-captcha.handler';

export async function POST(request: NextRequest) {
  return handleAnnotateCaptcha(request);
}

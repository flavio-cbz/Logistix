import { NextRequest } from 'next/server';
import { POST as handleRegister } from '@/lib/application/handlers/register.handler';

export async function POST(request: NextRequest) {
  return handleRegister(request);
}

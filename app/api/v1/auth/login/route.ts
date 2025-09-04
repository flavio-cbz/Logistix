import { NextResponse, NextRequest } from 'next/server';
import { logAuthenticationEvent } from "@/lib/middlewares/comprehensive-audit-logging";
import { loginUser } from '@/lib/services/auth/auth-service';
import { ApiError } from '@/lib/services/validation/error-types';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      await logAuthenticationEvent('login_failed', undefined, { reason: 'Missing credentials' });
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const result = await loginUser(email, password);

    if (result.success) {
      await logAuthenticationEvent('login', result.userId);
      const response = NextResponse.json({ message: 'Login successful', user: result.user }, { status: 200 });
      if (result.sessionId) {
        response.cookies.set('session_id', result.sessionId, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      }
      return response;
    } else {
      await logAuthenticationEvent('login_failed', undefined, { reason: result.message });
      return NextResponse.json({ message: result.message }, { status: result.statusCode });
    }
  } catch (error) {
    console.error('Login error:', error);
    const apiError = error instanceof ApiError ? error : new ApiError('Internal server error', 500);
    await logAuthenticationEvent('login_failed', undefined, { reason: apiError.message });
  return NextResponse.json({ message: apiError.message }, { status: apiError.statusCode ?? 500 });
  }
}
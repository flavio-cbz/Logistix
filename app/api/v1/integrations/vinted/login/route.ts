import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@/lib/utils/logging/logger';
import { vintedLoginService } from '@/lib/services/auth/vinted-login-service';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { z } from 'zod';

const logger = getLogger('API/Vinted/Login');

const loginSchema = z.object({
  cookie: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const userId = auth.user.id;

    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid input', errors: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { cookie } = parseResult.data;

    logger.info('Processing manual Vinted session', { userId });

    const result = await vintedLoginService.validateAndSaveSession(userId, cookie);

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Session saved successfully' });
    } else {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

  } catch (error) {
    logger.error('Vinted login API error', { error });
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

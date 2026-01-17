import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { serviceContainer } from '@/lib/services/container';
import { z } from 'zod';

const syncSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(1).optional(), // Accept username as alternative to email
  password: z.string().min(1).optional(),
  headless: z.boolean().optional(), // Optional headless flag
}).refine((data) => {
  const email = data.email || data.username;
  // If email/username is provided, password must also be provided
  if (email && !data.password) {
    return false;
  }
  // If password is provided, email/username must also be provided
  if (data.password && !email) {
    return false;
  }
  return true;
}, {
  message: "Both email/username and password must be provided together",
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const service = serviceContainer.getSuperbuyAutomationService();

    // Parse optional body for credentials
    let credentials: { email: string; password: string } | undefined;
    try {
      const body = await req.json();

      const validation = syncSchema.safeParse(body);
      if (validation.success) {
        const email = validation.data.email || validation.data.username;
        if (email && validation.data.password) {
          credentials = { email, password: validation.data.password };

        } else {

        }
      } else {

        return NextResponse.json({ error: 'Invalid input', details: validation.error }, { status: 400 });
      }
    } catch (_e) {

      // No body provided, that's fine
    }

    const result = await service.sync(user.id, credentials);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Sync completed successfully',
      data: result.data || { parcelsCount: 0, ordersCount: 0 }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

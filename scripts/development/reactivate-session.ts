#!/usr/bin/env tsx

import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
import { eq } from 'drizzle-orm';

async function reactivateSession() {
  console.log('Reactivating session...');

  await db.update(vintedSessions)
    .set({ 
      status: 'active',
      tokenExpiresAt: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
    })
    .where(eq(vintedSessions.userId, 'test-user'));

  console.log('Session reactivated and set as expired.');
}

reactivateSession().catch(console.error);
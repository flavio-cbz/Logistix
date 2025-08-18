#!/usr/bin/env tsx

/**
 * Script pour initialiser une session Vinted en base de données
 * avec le token du fichier .env
 */

import dotenv from 'dotenv';
dotenv.config();

import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions, users } from '@/lib/services/database/drizzle-schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function initVintedSession() {

  try {
    // Utiliser une session par défaut ou demander à l'utilisateur
    const defaultSession = 'session_par_defaut_a_remplacer';
    const vintedSession = process.env.VINTED_SESSION || defaultSession;

    if (vintedSession === defaultSession) {
    } else {
    }
    

    // Vérifier les sessions existantes
    const existingSessions = await db.select().from(vintedSessions);

    existingSessions.forEach((session, index) => {
    });

    // Récupérer l'ID de l'utilisateur admin
    const adminUser = await db.query.users.findFirst({
      where: eq(users.username, 'admin'),
    });

    if (!adminUser) {
      return;
    }

    const adminUserId = adminUser.id;
    const existingAdminSession = existingSessions.find(s => s.userId === adminUserId);

    if (existingAdminSession) {
      
      // Stocker le token en clair
      const now = new Date().toISOString();

      await db.update(vintedSessions)
        .set({
          sessionCookie: vintedSession,
          status: 'active',
          lastValidatedAt: now,
          updatedAt: now,
          refreshErrorMessage: null
        })
        .where(eq(vintedSessions.userId, adminUserId));

    } else {
      
      // Stocker le token en clair
      const now = new Date().toISOString();
      const sessionId = crypto.randomUUID();

      await db.insert(vintedSessions).values({
        id: sessionId,
        userId: adminUserId,
        sessionCookie: vintedSession,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastValidatedAt: now
      });

    }

    // Vérification finale
    const finalSessions = await db.select().from(vintedSessions);
    const adminSession = finalSessions.find(s => s.userId === adminUserId);

    if (adminSession && adminSession.sessionCookie) {
    } else {
    }


  } catch (error: any) {
  }
}

// Exécution du script
if (require.main === module) {
  initVintedSession().catch(console.error);
}
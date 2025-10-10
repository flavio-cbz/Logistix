// @ts-nocheck - Script needs refactoring for new DB adapter
#!/usr/bin/env tsx

/**
 * Script pour créer un utilisateur admin si il n'existe pas
 */

import dotenv from 'dotenv';
dotenv.config();

import { db } from '@/lib/services/database/drizzle-client';
import { users } from '@/lib/services/database/drizzle-schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function createAdminUser() {

  try {
    // Vérifier si l'utilisateur admin existe déjà
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.username, 'admin'),
    });

    if (existingAdmin) {
      return existingAdmin.id;
    }

    // Créer l'utilisateur admin
    const adminId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(users).values({
      id: adminId,
      username: 'admin',
      email: 'admin@logistix.local',
      password_hash: 'hashed_password', // Mot de passe fictif
      created_at: now,
      updated_at: now,
    });


    return adminId;

  } catch (error: unknown) {
    return null;
  }
}

// Exécution du script
if (require.main === module) {
  createAdminUser().catch(console.error);
}

export { createAdminUser };
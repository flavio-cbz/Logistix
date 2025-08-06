// API d’authentification Vinted : POST pour stocker le cookie, GET pour valider/rafraîchir le token

import { NextRequest, NextResponse } from 'next/server';
import { vintedCredentialService } from '@/lib/services/auth/vinted-credential-service';
import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';
import { databaseService } from '@/lib/services/database/db'; // Utiliser databaseService pour les requêtes brutes
import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// POST : stocke le cookie/token Vinted fourni par l’utilisateur
export async function POST(req: NextRequest) {
  try {
    const { cookie } = await req.json();
    if (!cookie || typeof cookie !== 'string') {
      return NextResponse.json({ error: 'Cookie Vinted manquant ou invalide.' }, { status: 400 });
    }

    // Récupérer l'utilisateur admin dynamiquement avec une requête SQL brute
    const adminUser = await databaseService.queryOne<{ id: string }>(
      "SELECT id FROM users WHERE username = 'admin' LIMIT 1"
    );

    if (!adminUser) {
        return NextResponse.json({ error: "L'utilisateur admin est introuvable dans la base de données." }, { status: 500 });
    }
    const userId = adminUser.id;

    // Chiffre et stocke le cookie en base (remplace l’existant)
    const encrypted = await vintedCredentialService.encrypt(cookie);

    // Génère les champs obligatoires
    const now = new Date().toISOString();
    const uuid = crypto.randomUUID();

    await db
      .insert(vintedSessions)
      .values({
        id: uuid,
        userId,
        session_cookie: encrypted,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: vintedSessions.userId,
        set: {
          session_cookie: encrypted,
          status: 'active',
          updatedAt: now,
        },
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[VINTED AUTH POST] Erreur détaillée :', err);
    return NextResponse.json({ error: 'Erreur lors de l’enregistrement du cookie.', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// GET : vérifie/rafraîchit le token et retourne l’état d’authentification
export async function GET() {
  try {
    // Récupère le cookie chiffré en base
    const session = await db.select().from(vintedSessions).limit(1);
    if (!session[0]?.session_cookie) {
      return NextResponse.json({ authenticated: false, error: 'Aucun cookie Vinted enregistré.' }, { status: 401 });
    }
    
    const cookie = await vintedCredentialService.decrypt(session[0].session_cookie);

    // Vérifie la validité du token
    const authService = new VintedAuthService(cookie);
    const { valid } = await authService.validateAccessToken();

    // Si invalide, tente un refresh
    let tokens = null;
    if (!valid) {
      tokens = await authService.refreshAccessToken();
    }
    

    // Extraction du token access_token_web pour l’exposer dans la réponse
    const accessToken = VintedAuthService.extractAccessTokenFromCookie(cookie);
    return NextResponse.json({
      authenticated: valid || !!tokens,
      tokens: tokens || (accessToken ? { accessToken } : null),
    });
  } catch (err) {
    return NextResponse.json({ authenticated: false, error: 'Erreur lors de la vérification.' }, { status: 500 });
  }
}
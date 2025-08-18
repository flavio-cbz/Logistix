#!/usr/bin/env tsx

/**
 * Test du système de rafraîchissement avec la session réelle de la base de données
 */

import dotenv from 'dotenv';
dotenv.config();

import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';
import { eq } from 'drizzle-orm';

async function testDBSessionRefresh() {

  try {
    // 1. Récupération de la session depuis la base
    const sessions = await db.select().from(vintedSessions);
    
    if (sessions.length === 0) {
      return;
    }

    const session = sessions[0];

    if (!session.sessionCookie) {
      return;
    }


    // 2. Analyse du cookie
    const cookie = session.sessionCookie;
    
    // Décoder le cookie s'il est encodé
    let decodedCookie = cookie;
    try {
      decodedCookie = decodeURIComponent(cookie);
    } catch {
    }

    const hasAccessToken = decodedCookie.includes('access_token_web=');
    const hasRefreshToken = decodedCookie.includes('refresh_token_web=');
    const hasSession = decodedCookie.includes('_vinted_fr_session=');
    

    if (!hasAccessToken || !hasRefreshToken) {
      
      // Test direct avec la session
      try {
        const response = await fetch('https://www.vinted.fr/api/v2/users/current', {
          headers: {
            'Cookie': decodedCookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        });

        if (response.status === 200) {
          const data = await response.json();
          if (data?.user) {
          }
        } else {
        }
      } catch (error: any) {
      }
      
      return;
    }

    // 3. Test avec VintedAuthService
    const authService = new VintedAuthService(decodedCookie);
    
    const accessToken = VintedAuthService.extractAccessTokenFromCookie(decodedCookie);
    const refreshToken = VintedAuthService.extractRefreshTokenFromCookie(decodedCookie);
    

    // 4. Validation du token
    const validation = await authService.validateAccessToken();
    
    
    if (validation.valid && validation.body?.user) {
    }

    // 5. Test de rafraîchissement si nécessaire
    if (!validation.valid) {
      
      const newTokens = await authService.refreshAccessToken();
      
      if (newTokens && newTokens.accessToken && newTokens.refreshToken) {
        
        // Construire le nouveau cookie
        const newCookie = decodedCookie
          .replace(/access_token_web=[^;]+/, `access_token_web=${newTokens.accessToken}`)
          .replace(/refresh_token_web=[^;]+/, `refresh_token_web=${newTokens.refreshToken}`);
        
        // Sauvegarder en base
        await db.update(vintedSessions)
          .set({
            sessionCookie: newCookie,
            status: 'active',
            lastValidatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .where(eq(vintedSessions.id, session.id));
        
      } else {
      }
    }

    // 6. Test du VintedSessionManager
    
    const refreshResult = await vintedSessionManager.refreshSession(session.userId);
    
    if (refreshResult.error) {
    }
    if (refreshResult.tokens) {
    }

    // 7. Résumé

  } catch (error: any) {
  }
}

// Exécution du script
if (require.main === module) {
  testDBSessionRefresh().catch(console.error);
}
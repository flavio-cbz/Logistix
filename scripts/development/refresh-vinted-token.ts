#!/usr/bin/env tsx

/**
 * Script pour récupérer le token expiré de la base de données et le rafraîchir
 */

import dotenv from 'dotenv';
dotenv.config();

import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';
import { vintedCredentialService } from '@/lib/services/auth/vinted-credential-service';
import { eq } from 'drizzle-orm';
import axios from 'axios';

async function refreshExpiredTokenFromDB() {

    try {
        // 1. Récupération des sessions depuis la base de données
        const sessions = await db.select().from(vintedSessions);


        if (sessions.length === 0) {
            return;
        }

        // Afficher toutes les sessions
        sessions.forEach((session, index) => {
            if (session.refreshErrorMessage) {
            }
        });

        // Sélectionner la session à traiter
        const targetSession = sessions.find(s => s.sessionCookie) || sessions[0];

        if (!targetSession) {
            return;
        }

        if (!targetSession.session_cookie) {
            return;
        }


        // 2. Déchiffrement du cookie
        let decryptedCookie: string;
        try {
            decryptedCookie = await vintedCredentialService.decrypt(targetSession.session_cookie);
        } catch (error: any) {
            return;
        }

        // 3. Analyse du cookie déchiffré
        const hasAccessToken = decryptedCookie.includes('access_token_web=');
        const hasRefreshToken = decryptedCookie.includes('refresh_token_web=');
        const hasSession = decryptedCookie.includes('_vinted_fr_session=');


        if (!hasAccessToken || !hasRefreshToken) {
            return;
        }

        // 4. Extraction des tokens
        const authService = new VintedAuthService(decryptedCookie);
        const accessToken = VintedAuthService.extractAccessTokenFromCookie(decryptedCookie);
        const refreshToken = VintedAuthService.extractRefreshTokenFromCookie(decryptedCookie);


        if (accessToken) {
        }
        if (refreshToken) {
        }

        // 5. Validation du token actuel
        const validation = await authService.validateAccessToken();


        if (validation.valid) {
            if (validation.body?.user) {
            }

            // Mettre à jour le statut en base
            await db.update(vintedSessions)
                .set({
                    status: 'active',
                    lastValidatedAt: new Date().toISOString(),
                    refreshErrorMessage: null
                })
                .where(eq(vintedSessions.id, targetSession.id));

            return;
        }

        // 6. Tentative de rafraîchissement
        try {
            const newTokens = await authService.refreshAccessToken();

            if (newTokens && newTokens.accessToken && newTokens.refreshToken) {

                // 7. Construction du nouveau cookie
                const newCookie = decryptedCookie
                    .replace(/access_token_web=[^;]+/, `access_token_web=${newTokens.accessToken}`)
                    .replace(/refresh_token_web=[^;]+/, `refresh_token_web=${newTokens.refreshToken}`);


                // 8. Validation du nouveau token
                const newAuthService = new VintedAuthService(newCookie);
                const newValidation = await newAuthService.validateAccessToken();


                if (newValidation.valid && newValidation.body?.user) {
                }

                // 9. Test d'accès à l'API Vinted avec le nouveau token
                const testEndpoints = [
                    {
                        name: 'Profil utilisateur',
                        url: 'https://www.vinted.fr/api/v2/users/current'
                    },
                    {
                        name: 'Suggestions d\'articles',
                        url: 'https://www.vinted.fr/api/v2/items/suggestions'
                    }
                ];

                let apiSuccessCount = 0;

                for (const endpoint of testEndpoints) {
                    try {

                        const response = await axios.get(endpoint.url, {
                            headers: {
                                'Cookie': newCookie,
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                            timeout: 10000,
                            validateStatus: () => true
                        });

                        if (response.status === 200) {

                            if (endpoint.name === 'Profil utilisateur' && response.data?.user) {
                            }

                            apiSuccessCount++;
                        } else {
                        }

                        // Pause entre les requêtes
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error: any) {
                    }
                }

                // 10. Sauvegarde du nouveau token en base de données
                try {
                    const encryptedNewCookie = await vintedCredentialService.encrypt(newCookie);
                    const now = new Date().toISOString();

                    await db.update(vintedSessions)
                        .set({
                            session_cookie: encryptedNewCookie,
                            status: 'active',
                            lastValidatedAt: now,
                            updatedAt: now,
                            refreshErrorMessage: null
                        })
                        .where(eq(vintedSessions.id, targetSession.id));

                } catch (error: any) {
                }

                // 11. Résumé final
            } else {

                // Mettre à jour le statut d'erreur en base
                await db.update(vintedSessions)
                    .set({
                        status: 'expired',
                        refreshErrorMessage: 'Impossible de rafraîchir le token'
                    })
                    .where(eq(vintedSessions.id, targetSession.id));
            }
        } catch (error: any) {

            // Mettre à jour le statut d'erreur en base
            await db.update(vintedSessions)
                .set({
                    status: 'error',
                    refreshErrorMessage: error.message
                })
                .where(eq(vintedSessions.id, targetSession.id));
        }

    } catch (error: any) {
    }
}

// Exécution du script
if (require.main === module) {
    refreshExpiredTokenFromDB().catch(console.error);
}
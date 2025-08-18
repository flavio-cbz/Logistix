#!/usr/bin/env tsx

/**
 * Test avec une vraie session cookie HTTP Vinted
 * Ce script utilise un cookie HTTP réel pour tester le système
 */

import dotenv from 'dotenv';
dotenv.config();

import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';
import axios from 'axios';

// Cookie HTTP réel Vinted (remplace par un vrai cookie si tu en as un)
const REAL_VINTED_COOKIE = ``.replace(/\s+/g, ' ').trim();

async function testWithRealSession() {

    try {

        // 1. Vérifier la structure du cookie
        const hasAccessToken = REAL_VINTED_COOKIE.includes('access_token_web=');
        const hasRefreshToken = REAL_VINTED_COOKIE.includes('refresh_token_web=');
        const hasSession = REAL_VINTED_COOKIE.includes('_vinted_fr_session=');


        if (!hasAccessToken || !hasRefreshToken) {
            return;
        }

        // 2. Utiliser VintedAuthService
        const authService = new VintedAuthService(REAL_VINTED_COOKIE);

        // 3. Extraire les tokens
        const accessToken = VintedAuthService.extractAccessTokenFromCookie(REAL_VINTED_COOKIE);
        const refreshToken = VintedAuthService.extractRefreshTokenFromCookie(REAL_VINTED_COOKIE);


        if (accessToken) {
        }
        if (refreshToken) {
        }

        // 4. Validation du token (ce token d'exemple est probably expiré)
        const validation = await authService.validateAccessToken();


        if (validation.valid && validation.body?.user) {
        } else if (validation.status === 401) {
        }

        // 5. Test de rafraîchissement (va probably échouer avec un token d'exemple)
        const newTokens = await authService.refreshAccessToken();

        if (newTokens && newTokens.accessToken && newTokens.refreshToken) {

            // Test avec le nouveau token
            const newCookie = REAL_VINTED_COOKIE
                .replace(/access_token_web=[^;]+/, `access_token_web=${newTokens.accessToken}`)
                .replace(/refresh_token_web=[^;]+/, `refresh_token_web=${newTokens.refreshToken}`);

            const newAuthService = new VintedAuthService(newCookie);
            const newValidation = await newAuthService.validateAccessToken();

        } else {
        }

        // 6. Test direct de l'API
        const testEndpoints = [
            'https://www.vinted.fr/api/v2/users/current',
            'https://www.vinted.fr/api/v2/items/suggestions'
        ];

        for (const endpoint of testEndpoints) {
            try {
                const response = await axios.get(endpoint, {
                    headers: {
                        'Cookie': REAL_VINTED_COOKIE,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    timeout: 10000,
                    validateStatus: () => true
                });

                if (response.status === 200) {
                } else {
                }
            } catch (error: any) {
            }
        }


    } catch (error: any) {
    }
}

// Exécution du script
if (require.main === module) {
    testWithRealSession().catch(console.error);
}
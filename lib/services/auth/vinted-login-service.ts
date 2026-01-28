
import { getLogger } from '@/lib/utils/logging/logger';
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';

const logger = getLogger('VintedLoginService');

export class VintedLoginService {
    private static instance: VintedLoginService;

    static getInstance(): VintedLoginService {
        if (!VintedLoginService.instance) {
            VintedLoginService.instance = new VintedLoginService();
        }
        return VintedLoginService.instance;
    }

    /**
     * Validates (basic format) and saves the manually provided Vinted cookie.
     */
    async validateAndSaveSession(userId: string, cookie: string): Promise<{ success: boolean; message: string }> {
        try {
            // Sanitize cookie: remove "Cookie:" prefix if present (case insensitive) and whitespace
            let cleanedCookie = cookie.trim();
            if (cleanedCookie.toLowerCase().startsWith('cookie:')) {
                cleanedCookie = cleanedCookie.substring(7).trim();
            }

            // Validation: Check for non-ASCII characters (often indication of copy-paste errors like "○ Compiling...")
            // Cookies should be ASCII only.
            if (/[^\x20-\x7E]/.test(cleanedCookie)) {
                throw new Error("Le cookie contient des caractères invalides (copie incorrecte ?)");
            }

            if (!cleanedCookie || !cleanedCookie.includes('_vinted_fr_session')) {
                logger.warn('Cookie might be malformed or missing session', { cookieSubset: cleanedCookie.substring(0, 10) });
            }

            // Save to database
            logger.info('Saving manual Vinted session...', { userId });
            await vintedSessionManager.saveSession(userId, cleanedCookie);

            return { success: true, message: 'Session saved successfully' };

        } catch (error) {
            logger.error('Manual login save error', { error });
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown save error'
            };
        }
    }
}

export const vintedLoginService = VintedLoginService.getInstance();

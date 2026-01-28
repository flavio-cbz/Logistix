/**
 * Tests pour le système de protection brute force
 * 
 * Teste les fonctionnalités de:
 * - Compteur de tentatives
 * - Blocage après X tentatives
 * - Backoff exponentiel
 * - Réinitialisation après succès
 * - Nettoyage automatique
 * 
 * @module middleware/__tests__/brute-force-protection.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    BruteForceProtection,
    loginBruteForceProtection,
    strictBruteForceProtection,
    getIdentifier,
    _bruteForceStore as store,
} from '@/lib/middleware/brute-force-protection';

describe('BruteForceProtection', () => {
    beforeEach(() => {
        // Activer les fake timers
        vi.useFakeTimers();
        // Vider le store avant chaque test
        store.clear();
    });

    afterEach(() => {
        // Restaurer les vrais timers
        vi.useRealTimers();
        store.clear();
    });

    describe('Configuration par défaut', () => {
        it('devrait créer une instance avec la config par défaut', () => {
            const protection = new BruteForceProtection();
            const stats = protection.getStats();

            expect(stats.totalEntries).toBe(0);
            expect(stats.blockedEntries).toBe(0);
        });

        it('devrait créer une instance avec une config personnalisée', () => {
            const protection = new BruteForceProtection({
                maxAttempts: 3,
                initialBlockDuration: 120000,
            });

            // Vérifier que la config est bien appliquée
            protection.recordFailedAttempt('test-id');
            protection.recordFailedAttempt('test-id');
            protection.recordFailedAttempt('test-id');

            const status = protection.isBlocked('test-id');
            expect(status.blocked).toBe(true);
        });
    });

    describe('Compteur de tentatives', () => {
        it('devrait compter les tentatives échouées', () => {
            const protection = new BruteForceProtection({ maxAttempts: 5 });

            protection.recordFailedAttempt('user@example.com');
            let status = protection.isBlocked('user@example.com');

            expect(status.blocked).toBe(false);
            expect(status.attempts).toBe(1);

            protection.recordFailedAttempt('user@example.com');
            status = protection.isBlocked('user@example.com');

            expect(status.blocked).toBe(false);
            expect(status.attempts).toBe(2);
        });

        it('devrait suivre plusieurs identifiants séparément', () => {
            const protection = new BruteForceProtection({ maxAttempts: 5 });

            protection.recordFailedAttempt('user1@example.com');
            protection.recordFailedAttempt('user1@example.com');

            protection.recordFailedAttempt('user2@example.com');

            const status1 = protection.isBlocked('user1@example.com');
            const status2 = protection.isBlocked('user2@example.com');

            expect(status1.attempts).toBe(2);
            expect(status2.attempts).toBe(1);
        });
    });

    describe('Blocage après X tentatives', () => {
        it('devrait bloquer après maxAttempts tentatives', () => {
            const protection = new BruteForceProtection({
                maxAttempts: 3,
                initialBlockDuration: 120000, // 2 minutes pour correspondre au backoff
            });

            const identifier = '192.168.1.1:user@example.com';

            // 3 tentatives échouées
            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);

            const status = protection.isBlocked(identifier);

            expect(status.blocked).toBe(true);
            expect(status.remainingTime).toBeGreaterThan(0);
            expect(status.remainingTime).toBeLessThanOrEqual(120000);
        });

        it('ne devrait pas bloquer avant maxAttempts', () => {
            const protection = new BruteForceProtection({ maxAttempts: 5 });

            const identifier = 'test-user';

            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);

            const status = protection.isBlocked(identifier);

            expect(status.blocked).toBe(false);
            expect(status.attempts).toBe(4);
        });
    });

    describe('Backoff exponentiel', () => {
        it('devrait augmenter la durée de blocage exponentiellement', () => {
            const protection = new BruteForceProtection({
                maxAttempts: 2,
                initialBlockDuration: 1000, // 1 seconde
                backoffMultiplier: 2,
                maxBlockDuration: 10000,
            });

            const identifier = 'backoff-test';

            // Premier blocage
            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);

            let status = protection.isBlocked(identifier);
            expect(status.blocked).toBe(true);
            const firstBlockTime = status.remainingTime!;

            // Attendre la fin du blocage
            vi.advanceTimersByTime(1100);

            // Deuxième série de tentatives
            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);

            status = protection.isBlocked(identifier);
            expect(status.blocked).toBe(true);
            const secondBlockTime = status.remainingTime!;

            // Le deuxième blocage devrait être ~2x plus long
            expect(secondBlockTime).toBeGreaterThan(firstBlockTime * 1.5);
        });

        it('ne devrait pas dépasser maxBlockDuration', () => {
            const protection = new BruteForceProtection({
                maxAttempts: 2,
                initialBlockDuration: 1000,
                backoffMultiplier: 10,
                maxBlockDuration: 5000,
            });

            const identifier = 'max-duration-test';

            // Plusieurs blocages pour atteindre le max
            for (let i = 0; i < 5; i++) {
                protection.recordFailedAttempt(identifier);
                protection.recordFailedAttempt(identifier);

                const status = protection.isBlocked(identifier);
                if (status.remainingTime) {
                    expect(status.remainingTime).toBeLessThanOrEqual(5000);
                }

                vi.advanceTimersByTime(6000);
            }
        });
    });

    describe('Réinitialisation après succès', () => {
        it('devrait réinitialiser le compteur après une tentative réussie', () => {
            const protection = new BruteForceProtection({ maxAttempts: 5 });

            const identifier = 'reset-test';

            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);

            let status = protection.isBlocked(identifier);
            expect(status.attempts).toBe(3);

            // Succès
            protection.recordSuccessfulAttempt(identifier);

            status = protection.isBlocked(identifier);
            expect(status.blocked).toBe(false);
            expect(status.attempts).toBeUndefined();
        });

        it('devrait débloquer un identifiant après succès même s\'il était bloqué', () => {
            const protection = new BruteForceProtection({
                maxAttempts: 2,
                initialBlockDuration: 60000,
            });

            const identifier = 'blocked-then-success';

            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);

            let status = protection.isBlocked(identifier);
            expect(status.blocked).toBe(true);

            // Succès (ex: admin débloque manuellement)
            protection.recordSuccessfulAttempt(identifier);

            status = protection.isBlocked(identifier);
            expect(status.blocked).toBe(false);
        });
    });

    describe('Réinitialisation automatique après inactivité', () => {
        it('devrait réinitialiser après resetAfter millisecondes d\'inactivité', () => {
            const protection = new BruteForceProtection({
                maxAttempts: 5,
                resetAfter: 10000, // 10 secondes
            });

            const identifier = 'auto-reset-test';

            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);

            let status = protection.isBlocked(identifier);
            expect(status.attempts).toBe(2);

            // Avancer le temps de 11 secondes
            vi.advanceTimersByTime(11000);

            status = protection.isBlocked(identifier);
            expect(status.blocked).toBe(false);
            expect(status.attempts).toBeUndefined();
        });
    });

    describe('Réinitialisation manuelle', () => {
        it('devrait permettre un déblocage manuel', () => {
            const protection = new BruteForceProtection({ maxAttempts: 2 });

            const identifier = 'manual-reset';

            protection.recordFailedAttempt(identifier);
            protection.recordFailedAttempt(identifier);

            let status = protection.isBlocked(identifier);
            expect(status.blocked).toBe(true);

            // Déblocage manuel (admin)
            protection.reset(identifier);

            status = protection.isBlocked(identifier);
            expect(status.blocked).toBe(false);
            expect(status.attempts).toBeUndefined();
        });
    });

    describe('Statistiques', () => {
        it('devrait retourner les statistiques globales', () => {
            const protection = new BruteForceProtection({ maxAttempts: 3 });

            protection.recordFailedAttempt('user1');
            protection.recordFailedAttempt('user1');

            protection.recordFailedAttempt('user2');
            protection.recordFailedAttempt('user2');
            protection.recordFailedAttempt('user2'); // Bloqué

            protection.recordFailedAttempt('user3');

            const stats = protection.getStats();

            expect(stats.totalEntries).toBe(3);
            expect(stats.blockedEntries).toBe(1);
            expect(stats.averageAttempts).toBe((2 + 3 + 1) / 3);
        });
    });

    describe('Instances pré-configurées', () => {
        it('loginBruteForceProtection devrait avoir une config modérée', () => {
            const identifier = 'login-test';

            // 5 tentatives pour bloquer
            for (let i = 0; i < 5; i++) {
                loginBruteForceProtection.recordFailedAttempt(identifier);
            }

            const status = loginBruteForceProtection.isBlocked(identifier);
            expect(status.blocked).toBe(true);

            // Cleanup
            loginBruteForceProtection.reset(identifier);
        });

        it('strictBruteForceProtection devrait avoir une config stricte', () => {
            const identifier = 'strict-test';

            // 3 tentatives pour bloquer
            for (let i = 0; i < 3; i++) {
                strictBruteForceProtection.recordFailedAttempt(identifier);
            }

            const status = strictBruteForceProtection.isBlocked(identifier);
            expect(status.blocked).toBe(true);

            // Cleanup
            strictBruteForceProtection.reset(identifier);
        });
    });

    describe('Helper getIdentifier', () => {
        it('devrait créer un identifiant simple avec IP uniquement', () => {
            const identifier = getIdentifier('192.168.1.1');
            expect(identifier).toBe('192.168.1.1');
        });

        it('devrait créer un identifiant composé avec IP + clé additionnelle', () => {
            const identifier = getIdentifier('192.168.1.1', 'user@example.com');
            expect(identifier).toBe('192.168.1.1:user@example.com');
        });
    });

    describe('Métadonnées de logging', () => {
        it('devrait accepter des métadonnées optionnelles', () => {
            const protection = new BruteForceProtection({ maxAttempts: 3 });

            const identifier = 'metadata-test';
            const metadata = {
                userAgent: 'Mozilla/5.0',
                endpoint: '/api/v1/auth/login',
            };

            // Ne devrait pas throw
            expect(() => {
                protection.recordFailedAttempt(identifier, metadata);
            }).not.toThrow();
        });
    });
});

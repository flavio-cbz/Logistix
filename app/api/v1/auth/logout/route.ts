import { POST as handleLogout } from '@/lib/application/handlers/logout.handler';

/**
 * POST /api/v1/auth/logout
 * 
 * Déconnecte l'utilisateur en supprimant la session et en effaçant le cookie.
 * 
 * Route migrée vers l'architecture clean (use-case + handler).
 * 
 * @see lib/application/use-cases/logout-user.use-case.ts
 * @see lib/application/handlers/logout.handler.ts
 * @see tests/integration/auth-handlers.test.ts
 */
export async function POST() {
  return handleLogout();
}

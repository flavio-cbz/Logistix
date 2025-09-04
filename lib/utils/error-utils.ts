/**
 * Utilitaires pour normaliser l'extraction d'un message d'erreur en mode TypeScript strict.
 * Utiliser getErrorMessage(error) dans les blocs `catch (error: unknown)` avant d'accéder au message.
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error as Record<string, unknown>);
    } catch {
      // fallback below
    }
  }
  return String(error ?? 'Unknown error');
}

export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(getErrorMessage(error));
}
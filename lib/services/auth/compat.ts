import { verifyCredentials as verifyCredentialsNew } from './auth';

/**
 * Compat wrapper for verifyCredentials to support old call sites.
 * Legacy single-argument usage verifyCredentials(password) is insecure and is no longer supported.
 * Callers must use verifyCredentials(username, password).
 */
export async function verifyCredentials(arg1: string, arg2?: string) {
  if (typeof arg2 === 'undefined') {
    // Legacy call detected — reject explicitly to avoid implicit admin logins
    throw new Error('Legacy verifyCredentials(password) is unsupported. Use verifyCredentials(username, password).');
  }

  // New call: verifyCredentials(username, password)
  return verifyCredentialsNew(arg1, arg2);
}
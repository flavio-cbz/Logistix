// Utilitaire pour décoder un token Vinted et extraire la date d’expiration

export function decodeVintedTokenExpiration(token: string): Date | null {
  if (!token) return null;

  // Si JWT (base64 avec 2 points)
  if (token.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1] || "", 'base64').toString());
      if (payload.exp) {
        // exp est en secondes depuis Epoch
        return new Date(payload.exp * 1000);
      }
    } catch {
      return null;
    }
  }

  // Sinon, estimation : access_token_web ≈ 2h
  const now = new Date();
  return new Date(now.getTime() + 2 * 60 * 60 * 1000);
}
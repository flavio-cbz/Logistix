import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/services/auth/auth';

export default async function adminMiddleware() {
  try {
    const user = await getSessionUser();

    // Si l'utilisateur n'est pas authentifié ou n'est pas admin -> 403
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Accès interdit - rôle admin requis' },
        { status: 403 }
      );
    }

    // Autorisé
    return null;
  } catch (error) {
    // En cas d'erreur inattendue, renvoyer 403 pour ne pas divulguer d'information
    return NextResponse.json(
      { success: false, message: 'Accès interdit' },
      { status: 403 }
    );
  }
}
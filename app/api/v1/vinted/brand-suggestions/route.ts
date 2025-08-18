import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';
import { vintedCredentialService } from '@/lib/services/auth/vinted-credential-service';
import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get('title');
  const categoryId = searchParams.get('category_id');

  if (!title || !categoryId) {
    return NextResponse.json({ error: 'Les paramètres "title" et "category_id" sont manquants.' }, { status: 400 });
  }

  try {
    const session = await db.select().from(vintedSessions).limit(1);
    if (!session[0]?.sessionCookie) throw new Error('Aucun cookie Vinted enregistré.');
    const cookie = await vintedCredentialService.decrypt(session[0].sessionCookie);
    const token = VintedAuthService.extractAccessTokenFromCookie(cookie);
    if (!token) throw new Error('Token Vinted non disponible');

    const url = `https://www.vinted.fr/api/v2/item_upload/suggestions/attributes?title=${encodeURIComponent(title)}&category_id=${categoryId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur de l'API Vinted: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
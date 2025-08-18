import { VintedCategoryFetcher } from '@/lib/services/vinted-category-fetcher';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await VintedCategoryFetcher.clearCache();
    return NextResponse.json({ message: 'Cache des catégories Vinted vidé avec succès.' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
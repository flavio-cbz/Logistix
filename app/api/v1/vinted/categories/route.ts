import { VintedCategoryFetcher } from '@/lib/services/vinted-category-fetcher';
import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET() {
  try {
    const categories = await VintedCategoryFetcher.fetchCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { aiInsightsCache } from '@/lib/services/ai/memory-cache';
import adminMiddleware from '@/app/api/admin/middleware';

export async function POST() {
  const adminCheck = await adminMiddleware();
  if (adminCheck) return adminCheck;

  try {
    await aiInsightsCache.clear();
    
    return NextResponse.json({
      success: true,
      message: 'Cache vidé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du vidage du cache:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
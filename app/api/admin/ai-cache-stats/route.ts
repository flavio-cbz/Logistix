import { NextResponse } from 'next/server';
import { aiInsightsCache } from '@/lib/services/ai/memory-cache';
import adminMiddleware from '@/app/api/admin/middleware';

export async function GET() {
  const adminCheck = await adminMiddleware();
  if (adminCheck) return adminCheck;

  try {
    const stats = aiInsightsCache.getStats();
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des stats du cache:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
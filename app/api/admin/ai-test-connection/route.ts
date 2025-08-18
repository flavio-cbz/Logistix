import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import adminMiddleware from '@/app/api/admin/middleware';

export async function POST(request: NextRequest) {
  const adminCheck = await adminMiddleware();
  if (adminCheck) return adminCheck;

  try {
    const { apiKey, baseURL } = await request.json();
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'Clé API manquante' },
        { status: 400 }
      );
    }
    
    // Déterminer si c'est NVIDIA ou OpenAI basé sur l'URL de base
    const isNVIDIA = baseURL && baseURL.includes('nvidia.com');
    
    // Configurer le client OpenAI (compatible avec NVIDIA)
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL || undefined,
    });
    
    // Faire un appel simple pour tester la connexion
    const response = await openai.models.list();
    
    if (response.data && response.data.length > 0) {
      const provider = isNVIDIA ? 'NVIDIA' : 'OpenAI';
      const modelCount = response.data.length;
      const sampleModels = response.data.slice(0, 5).map(model => model.id);
      
      return NextResponse.json({
        success: true,
        message: `Connexion ${provider} réussie`,
        provider: provider,
        modelCount: modelCount,
        models: sampleModels
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Aucun modèle disponible' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erreur lors du test de connexion:', error);
    
    let errorMessage = 'Erreur de connexion';
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Clé API invalide';
      } else if (error.message.includes('429')) {
        errorMessage = 'Limite de taux dépassée';
      } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
        errorMessage = "Erreur réseau - Vérifiez l'URL de base";
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Timeout de connexion';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 400 }
    );
  }
}
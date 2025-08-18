import { NextRequest, NextResponse } from 'next/server';
import { ModelDiscoveryService } from '@/lib/services/ai/model-discovery';
import adminMiddleware from '@/app/api/admin/middleware';

export async function POST(request: NextRequest) {
  const adminCheck = await adminMiddleware();
  if (adminCheck) return adminCheck;

  try {
    const { endpointUrl, apiKey } = await request.json();
    
    if (!endpointUrl || !apiKey) {
      return NextResponse.json(
        { success: false, message: "URL d'endpoint et clé API requis" },
        { status: 400 }
      );
    }
    
    const discoveryService = ModelDiscoveryService.getInstance();
    
    // Détecter le type d'endpoint
    const endpointInfo = discoveryService.detectEndpointType(endpointUrl);
    
    // Découvrir les modèles disponibles
    const models = await discoveryService.discoverModels(endpointUrl, apiKey);
    
    return NextResponse.json({
      success: true,
      endpointInfo,
      models,
      totalModels: models.length,
      recommendedModels: models.filter(m => m.recommended).length,
      testedModels: models.filter(m => m.tested).length
    });
    
  } catch (error) {
    console.error('Erreur lors de la découverte des modèles:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur serveur' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const adminCheck = await adminMiddleware();
  if (adminCheck) return adminCheck;

  try {
    const discoveryService = ModelDiscoveryService.getInstance();
    
    // Retourner les modèles recommandés et les catégories
    const recommendedModels = discoveryService.getRecommendedModels();
    const modelsByCategory = discoveryService.getTopModelsByCategory();
    
    return NextResponse.json({
      success: true,
      recommendedModels,
      modelsByCategory,
      totalRecommended: recommendedModels.length
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des modèles recommandés:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur serveur' 
      },
      { status: 500 }
    );
  }
}
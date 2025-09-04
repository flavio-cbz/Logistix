import { NextRequest, NextResponse } from 'next/server';
import { ModelDiscoveryService } from '@/lib/services/ai/model-discovery';
import adminMiddleware from '@/app/api/admin/middleware';

export async function GET() {
  const adminCheck = await adminMiddleware();
  if (adminCheck) return adminCheck;

  try {
    const discoveryService = ModelDiscoveryService.getInstance();
    const recommendedModels =
      typeof discoveryService.getRecommendedModels === 'function'
        ? discoveryService.getRecommendedModels()
        : [];
    const modelsByCategory =
      typeof discoveryService.getTopModelsByCategory === 'function'
        ? discoveryService.getTopModelsByCategory()
        : [];

    return NextResponse.json({
      success: true,
      recommendedModels,
      modelsByCategory,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/ai-models:', error);
    return NextResponse.json(
      { success: false, _message: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await adminMiddleware();
  if (adminCheck) return adminCheck;

  try {
    const body = await request.json();
    // Support forwarding to the existing discover implementation
    if (body?.action === 'discover' && body?.endpointUrl && body?.apiKey) {
      const models = await ModelDiscoveryService.getInstance().discoverModels(body.endpointUrl, body.apiKey);
      return NextResponse.json({ success: true, models, totalModels: models.length });
    }

    return NextResponse.json({ success: false, _message: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/admin/ai-models:', error);
    return NextResponse.json(
      { success: false, _message: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { AISettingsManager } from '@/lib/config/ai-settings';
import adminMiddleware from '@/app/api/admin/middleware';

export async function GET() {
  const adminCheck = await adminMiddleware();
  if (adminCheck) return adminCheck;

  try {
    const settingsManager = AISettingsManager.getInstance();
    const settings = settingsManager.getSettings();
    
    // Masquer la clé API pour la sécurité
    const safeSettings = {
      ...settings,
      openai: {
        ...settings.openai,
        apiKey: settings.openai.apiKey ? '***' + settings.openai.apiKey.slice(-4) : ''
      }
    };
    
    return NextResponse.json({
      success: true,
      settings: safeSettings
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres AI:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await adminMiddleware();
  if (adminCheck) return adminCheck;

  try {
    const { settings } = await request.json();
    
    if (!settings) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants' },
        { status: 400 }
      );
    }
    
    const settingsManager = AISettingsManager.getInstance();
    await settingsManager.updateSettings(settings);
    
    return NextResponse.json({
      success: true,
      message: 'Paramètres mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres AI:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur serveur' 
      },
      { status: 500 }
    );
  }
}
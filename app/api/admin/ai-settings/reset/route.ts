import { NextResponse } from 'next/server';
import { AISettingsManager } from '@/lib/config/ai-settings';
import adminMiddleware from '@/app/api/admin/middleware';

export async function POST() {
  const adminCheck = await adminMiddleware();
  if (adminCheck) return adminCheck;

  try {
    const settingsManager = AISettingsManager.getInstance();
    await settingsManager.resetToDefaults();
    
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
      settings: safeSettings,
      message: 'Paramètres réinitialisés aux valeurs par défaut'
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des paramètres AI:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur serveur' 
      },
      { status: 500 }
    );
  }
}
/**
 * Vérifie si l'utilisateur est authentifié sur Superbuy
 * GET /api/v1/superbuy/auth/verify
 */

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {


    // Résoudre le chemin du fichier d'état d'authentification
    const rootPath = path.resolve(process.cwd(), 'auth_state.json');
    const scriptsPath = path.resolve(process.cwd(), 'scripts', 'superbuy', 'auth_state.json');
    const authStatePath = fs.existsSync(scriptsPath) ? scriptsPath : rootPath;

    if (!fs.existsSync(authStatePath)) {

      return NextResponse.json({
        authenticated: false,
        message: 'No auth state found',
      });
    }

    const authRaw = fs.readFileSync(authStatePath, 'utf-8');
    const authState = JSON.parse(authRaw);

    if (!authState.cookies || authState.cookies.length === 0) {

      return NextResponse.json({
        authenticated: false,
        message: 'No cookies found',
      });
    }

    // Vérifier l'âge de la session via timestamp ou, à défaut, mtime du fichier
    let hoursSinceAuth: number;
    const now = new Date();
    if (authState.timestamp) {
      const timestamp = new Date(authState.timestamp);
      const diffMs = now.getTime() - timestamp.getTime();
      hoursSinceAuth = diffMs / (1000 * 60 * 60);
    } else {
      const stats = fs.statSync(authStatePath);
      const diffMs = now.getTime() - stats.mtime.getTime();
      hoursSinceAuth = diffMs / (1000 * 60 * 60);
    }

    if (Number.isNaN(hoursSinceAuth) || hoursSinceAuth > 24) {

      return NextResponse.json({
        authenticated: false,
        message: 'Session expired',
        hoursSinceAuth,
      });
    }



    return NextResponse.json({
      authenticated: true,
      message: 'Valid session',
      cookieCount: authState.cookies.length,
      age: `${hoursSinceAuth.toFixed(2)} hours`,
    });

  } catch (error) {
    // console.error('[Auth Verify] Error:', error);

    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

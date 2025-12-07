/**
 * Endpoint de test pour les load tests
 * Route non-authentifiée pour valider la performance de l'infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';

interface TestResponse {
  status: 'ok';
  timestamp: number;
  environment: string;
  version: string;
  data: {
    message: string;
    requestId: string;
    serverTime: string;
    load?: {
      cpu: number;
      memory: number;
    };
  };
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    // Simuler une charge de traitement légère
    const start = Date.now();
    let _sum = 0;
    for (let i = 0; i < 10000; i++) {
      _sum += Math.sqrt(i);
    }
    const processingTime = Date.now() - start;

    // Collecter quelques métriques basiques
    const memUsage = process.memoryUsage();

    const response: TestResponse = {
      status: 'ok',
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      data: {
        message: `Load test endpoint operational (processed in ${processingTime}ms)`,
        requestId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        serverTime: new Date().toISOString(),
        load: {
          cpu: processingTime, // Approximation du CPU usage
          memory: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (_error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: Date.now(),
        error: {
          message: 'Internal server error',
          code: 'LOAD_TEST_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({}));

    // Simuler un traitement de données
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

    const response = {
      received: {
        method: 'POST',
        timestamp: Date.now(),
        bodySize: JSON.stringify(body).length,
      },
      echo: body,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (_error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: Date.now(),
        error: {
          message: 'Internal server error',
          code: 'LOAD_TEST_POST_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

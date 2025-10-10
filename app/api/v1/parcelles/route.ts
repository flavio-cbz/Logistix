import { NextRequest } from 'next/server';
import { GET as handleListParcelles } from '@/lib/application/handlers/list-parcelles.handler';
import { POST as handleCreateParcelle } from '@/lib/application/handlers/create-parcelle.handler';

export async function GET(request: NextRequest) {
  return handleListParcelles(request);
}

export async function POST(request: NextRequest) {
  return handleCreateParcelle(request);
}

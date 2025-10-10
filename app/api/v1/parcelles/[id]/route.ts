import { NextRequest } from 'next/server';
import { PUT as handleUpdateParcelle } from '@/lib/application/handlers/update-parcelle.handler';
import { DELETE as handleDeleteParcelle } from '@/lib/application/handlers/delete-parcelle.handler';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdateParcelle(request, { params });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdateParcelle(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleDeleteParcelle(request, { params });
}

import { NextRequest } from "next/server";
import { GET as handleListProduits } from "@/lib/application/handlers/list-products.handler";
import { POST as handleCreateProduit } from "@/lib/application/handlers/create-product.handler";

export async function GET(request: NextRequest) {
  return handleListProduits(request);
}

export async function POST(request: NextRequest) {
  return handleCreateProduit(request);
}

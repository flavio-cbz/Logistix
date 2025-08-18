import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("Erreur lors de la récupération de la session:", error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}
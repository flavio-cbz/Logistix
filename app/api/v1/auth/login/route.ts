import { NextResponse } from "next/server";
import { verifyCredentials, createSession } from "@/lib/services/auth";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    const user = await verifyCredentials(validatedData.password);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Identifiant ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    const sessionId = await createSession(user.id);
    const response = NextResponse.json({ success: true, message: "Connexion réussie" });
    response.cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Erreur de validation", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Erreur dans l'API login:", error);
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

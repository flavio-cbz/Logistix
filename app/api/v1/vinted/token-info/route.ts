import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { vintedCredentialService } from "@/lib/services/auth/vinted-credential-service";
import { db } from "@/lib/services/database/drizzle-client";
import { vintedSessions } from "@/lib/services/database/drizzle-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logging/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non authentifié", configured: false }, { status: 401 });
    }

    const session = await db.query.vintedSessions.findFirst({
      where: eq(vintedSessions.userId, user.id),
    });

    if (!session || !session.sessionCookie) {
      return NextResponse.json({ configured: false, token: null });
    }

    try {
      const token = await vintedCredentialService.decrypt(session.sessionCookie);
      return NextResponse.json({ configured: true, token });
    } catch (err: any) {
      logger.error("Erreur de déchiffrement du token Vinted", { error: err, userId: user.id });
      return NextResponse.json({ error: "Erreur de déchiffrement", configured: false }, { status: 500 });
    }
  } catch (error) {
    logger.error("Erreur inattendue dans GET /api/v1/vinted/token-info", { error });
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token || typeof token !== "string" || token.length < 10) {
      return NextResponse.json({ error: "Token Vinted invalide" }, { status: 400 });
    }

    const encryptedToken = await vintedCredentialService.encrypt(token);
    const now = new Date().toISOString();

    const existing = await db.query.vintedSessions.findFirst({
      where: eq(vintedSessions.userId, user.id),
    });

    if (existing) {
      await db.update(vintedSessions)
        .set({ sessionCookie: encryptedToken, updatedAt: now, status: "active" })
        .where(eq(vintedSessions.userId, user.id));
    } else {
      await db.insert(vintedSessions).values({
        id: crypto.randomUUID(),
        userId: user.id,
        sessionCookie: encryptedToken,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ configured: true });
  } catch (err: any) {
    const userId = (await getSessionUser())?.id;
    logger.error("Erreur lors de la sauvegarde du token Vinted", { error: err, userId });
    return NextResponse.json({ error: "Erreur lors de la sauvegarde du token" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
    }

    await db.delete(vintedSessions).where(eq(vintedSessions.userId, user.id));

    return NextResponse.json({ configured: false });
  } catch (err: any) {
    const userId = (await getSessionUser())?.id;
    logger.error("Erreur lors de la suppression du token Vinted", { error: err, userId });
    return NextResponse.json({ error: "Erreur lors de la suppression du token" }, { status: 500 });
  }
}
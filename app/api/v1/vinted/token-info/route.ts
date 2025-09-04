import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { db } from "@/lib/services/database/drizzle-client";
import { vintedSessions } from "@/lib/services/database/drizzle-schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logging/logger";
import { vintedSessionCipherService } from "@/lib/services/auth/vinted-session-cipher-service";
import { testVintedSessionCookie } from '@/lib/services/auth/vinted-session-validator';

/**
 * GET /api/v1/vinted/token-info
 * Retourne le token Vinted déchiffré (si possible)
 */
export async function GET(_req: NextRequest) {
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
      // Support both possible property namings from DB mapping
      const encryptedDek = (session as any).encryptedDek ?? (session as any).encrypted_dek ?? null;

      const token = await vintedSessionCipherService.decryptSession(user.id, session.sessionCookie, encryptedDek);
      return NextResponse.json({ configured: true, token });
    } catch (err: any) {
      logger.error("Erreur de déchiffrement du token Vinted", { error: err, userId: user.id });
      // Dégradation gracieuse : renvoyer configured:false au lieu d'une 500 pour éviter de casser le frontend
      return NextResponse.json({ configured: false, token: null });
    }
  } catch (error) {
    logger.error("Erreur inattendue dans GET /api/v1/vinted/token-info", { error });
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

/**
 * POST /api/v1/vinted/token-info
 * Enregistre / met à jour le token Vinted chiffré (nouveau format DEK/KEK)
 */
export async function POST(_req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
    }

    const { token } = await _req.json();
    if (!token || typeof token !== "string" || token.length < 10) {
      return NextResponse.json({ error: "Token Vinted invalide" }, { status: 400 });
    }

    // Valider le token via le validateur centralisé avant chiffrement / stockage
    try {
      const validation = await testVintedSessionCookie(token);
      if (!validation?.success || !validation?.valid) {
        logger.info("Validation du token Vinted échouée lors de POST /token-info", { userId: user.id, validation });
        return NextResponse.json({ error: validation?.message || "Token Vinted invalide", details: validation?.details ?? null }, { status: 400 });
      }
    } catch (valErr: any) {
      logger.error("Erreur pendant la validation du token Vinted", { error: valErr, userId: user.id });
      return NextResponse.json({ error: "Erreur lors de la validation du token Vinted" }, { status: 500 });
    }

    // Use envelope encryption service — pass user id and token
    const { encryptedToken, encryptedDek, metadata } = await vintedSessionCipherService.encryptSession(user.id, token);

    // Log valeurs encryptées (longueur/base64)
    logger.debug("encryptSession output", {
      encryptedToken_length: encryptedToken.length,
      encryptedToken_preview: encryptedToken.slice(0, 32),
      encryptedDek_length: encryptedDek.length,
      encryptedDek_preview: encryptedDek.slice(0, 32),
      metadata_length: metadata.length,
      metadata_preview: metadata.slice(0, 128),
      userId: user.id,
    });

    const now = new Date().toISOString();

    const existing = await db.query.vintedSessions.findFirst({
      where: eq(vintedSessions.userId, user.id),
    });

    // Ensure metadata is an object before assigning to Drizzle JSON column
    const parsedMetadata = JSON.parse(metadata) as Record<string, unknown>;

    if (existing) {
      const updateData = {
        sessionCookie: encryptedToken,
        encryptedDek: encryptedDek,
        encryptionMetadata: parsedMetadata, // Assign the parsed object
        updatedAt: now,
        status: "active" as "active" | "error" | "expired" | "requires_configuration",
        lastValidatedAt: now,
      };
      logger.info("Drizzle UPDATE vintedSessions", {
        userId: user.id,
        updateData,
      });
      await db.update(vintedSessions)
        .set(updateData) // No need for casting here, as encryptionMetadata is already parsed
        .where(eq(vintedSessions.userId, user.id));
    } else {
      const insertData = {
        id: crypto.randomUUID(),
        userId: user.id,
        sessionCookie: encryptedToken,
        encryptedDek: encryptedDek,
        encryptionMetadata: parsedMetadata, // Assign the parsed object
        status: "active" as "active" | "error" | "expired" | "requires_configuration",
        createdAt: now,
        updatedAt: now,
        lastValidatedAt: now,
      };
      logger.info("Drizzle INSERT vintedSessions", {
        userId: user.id,
        insertData,
      });
      await db.insert(vintedSessions).values(insertData);
    }

    return NextResponse.json({ configured: true });
  } catch (err: any) {
    const userId = (await getSessionUser())?.id;
    logger.error("Erreur lors de la sauvegarde du token Vinted", {
      error_message: err?.message,
      error_stack: err?.stack,
      error_code: err?.code,
      error_full: err,
      userId,
    });
    return NextResponse.json({ error: "Erreur lors de la sauvegarde du token" }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/vinted/token-info
 * Supprime la session Vinted pour l'utilisateur
 */
export async function DELETE(_req: NextRequest) {
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
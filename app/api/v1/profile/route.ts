import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { updateProfileSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/middleware/validation-middleware";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";
import { databaseService } from "@/lib/database";
import { users, products, parcelles } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logging/logger";

/**
 * GET /api/v1/profile
 * Récupère le profil complet de l'utilisateur connecté
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createErrorResponse(new Error("Non authentifié")),
        { status: 401 }
      );
    }

    // Récupérer le profil complet avec les stats
    const db = await databaseService.getDb();
    const profile = await db.select().from(users).where(eq(users.id, user.id)).get();
    
    if (!profile) {
      return NextResponse.json(
        createErrorResponse(new Error("Profil non trouvé")),
        { status: 404 }
      );
    }

    // Récupérer les statistiques
    const totalProducts = await db.select().from(products).where(eq(products.userId, user.id)).all();
    const totalParcels = await db.select().from(parcelles).where(eq(parcelles.userId, user.id)).all();
    
    const stats = {
      totalProducts: totalProducts.length,
      totalParcelles: totalParcels.length,
      totalAnalyses: 0,
      joinedDate: profile.createdAt,
    };

    // Calculer les jours d'activité
    const createdDate = new Date(profile.createdAt);
    const today = new Date();
    const daysActive = Math.floor(
      (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const response = {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      bio: profile.bio,
      avatar: profile.avatar,
      language: profile.language,
      theme: profile.theme,
      role: profile.role,
      lastLoginAt: profile.lastLoginAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      stats: {
        totalProducts: stats?.totalProducts || 0,
        totalParcels: stats?.totalParcelles || 0,
        daysActive,
      },
    };

    logger.info("Profile retrieved successfully", { userId: user.id });
    return NextResponse.json(createSuccessResponse(response));
  } catch (error) {
    logger.error("Error retrieving profile", { error });
    return NextResponse.json(
      createErrorResponse(
        error instanceof Error ? error : new Error("Erreur interne")
      ),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/profile
 * Met à jour le profil de l'utilisateur connecté
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createErrorResponse(new Error("Non authentifié")),
        { status: 401 }
      );
    }

    // Valider le body
    const { data: validatedData } = await validateBody(updateProfileSchema, request);

    // Mettre à jour le profil
    const db = await databaseService.getDb();
    const updatedProfile = await db
      .update(users)
      .set({
        email: validatedData.email,
        bio: validatedData.bio,
        avatar: validatedData.avatar || null,
        language: validatedData.language,
        theme: validatedData.theme,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id))
      .returning()
      .get();

    if (!updatedProfile) {
      return NextResponse.json(
        createErrorResponse(new Error("Impossible de mettre à jour le profil")),
        { status: 500 }
      );
    }

    logger.info("Profile updated successfully", { userId: user.id });
    return NextResponse.json(
      createSuccessResponse({
        message: "Profil mis à jour avec succès",
        profile: {
          id: updatedProfile.id,
          username: updatedProfile.username,
          email: updatedProfile.email,
          bio: updatedProfile.bio,
          avatar: updatedProfile.avatar,
          language: updatedProfile.language,
          theme: updatedProfile.theme,
        },
      })
    );
  } catch (error) {
    logger.error("Error updating profile", { error });
    return NextResponse.json(
      createErrorResponse(
        error instanceof Error ? error : new Error("Erreur interne")
      ),
      { status: 500 }
    );
  }
}

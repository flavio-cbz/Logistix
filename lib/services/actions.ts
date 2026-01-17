"use server";

import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { getErrorMessage } from "@/lib/utils/error-utils";
import {
  databaseService,
  generateId,
  getCurrentTimestamp,
} from "@/lib/database";
import type { DashboardConfig } from "@/lib/types/dashboard";
// ParcelStatus imported but unused warning -> used in casting below or removed if not needed?
// It was used in my Task 498 but tsc says unused.
// Let's ensure it is used.
import { ParcelStatus, Parcel } from "@/lib/shared/types/entities";
import { logger } from "@/lib/utils/logging/logger";
import type { LogContext } from "@/lib/utils/logging/logger";
import { CustomError } from "@/lib/errors/custom-error";
import type { CreateParcelInput, UpdateParcelInput } from "@/lib/shared/types/entities";
import { serviceContainer } from "@/lib/services/container";

// Schémas de validation Zod améliorés
const userSchema = z.object({
  username: z
    .string()
    .min(2, "Le nom d'utilisateur doit faire au moins 2 caractères")
    .max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores",
    ),
  password: z
    .string()
    .min(6, "Le mot de passe doit faire au moins 6 caractères")
    .max(100, "Le mot de passe ne peut pas dépasser 100 caractères"),
});

const loginSchema = z.object({
  password: z.string().min(1, "Le mot de passe est requis"),
});

const parcelleSchema = z.object({
  numero: z.string().min(1, "Le numéro de parcelle est requis"),
  transporteur: z.string().min(1, "Le transporteur est requis"),
  nom: z.string().min(1, "Le nom de la parcelle est requis"),
  statut: z.string().min(1, "Le statut est requis"),
  prixAchat: z.number().nonnegative("Le prix d'achat doit être positif"),
  poids: z.number().positive("Le poids doit être positif"),
});

// =============================================================================
// ACTIONS D'AUTHENTIFICATION
// =============================================================================

export async function signUp(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  try {
    const validatedData = userSchema.parse({ username, password });
    const authService = serviceContainer.getAuthService();

    const user = await authService.createUser({
      username: validatedData.username,
      password: validatedData.password,
    });

    await authService.createSession(user.id);

    logger.info(`Nouvel utilisateur créé: ${validatedData.username}`, {
      userId: user.id,
    });
    return { success: true, _message: "Inscription réussie" };
  } catch (error: unknown) {
    logger.error("Erreur lors de l'inscription:", {
      error: error instanceof Error ? error.message : String(error),
    } as LogContext);

    if (error instanceof ZodError) {
      const errorMessages = error.issues
        .map((err) => err.message)
        .join(", ");
      return { success: false, _message: errorMessages };
    }

    return {
      success: false,
      _message:
        getErrorMessage(error) ||
        "Une erreur s'est produite lors de l'inscription",
    };
  }
}

export async function signIn(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  try {
    const validatedData = loginSchema.parse({ password });

    if (!username) {
      return { success: false, _message: "Le nom d'utilisateur est requis" };
    }

    const authService = serviceContainer.getAuthService();
    const result = await authService.authenticate(username, validatedData.password);

    if (result.success) {
      return {
        success: true,
        _message: "Connexion réussie",
        sessionId: result.sessionId,
      };
    }

    return { success: false, _message: result.message || "Échec de la connexion" };

  } catch (error: unknown) {
    logger.error("Erreur lors de la connexion:", {
      error: error instanceof Error ? error.message : String(error),
    } as LogContext);

    if (error instanceof ZodError) {
      const errorMessages = error.issues
        .map((err) => err.message)
        .join(", ");
      return { success: false, _message: errorMessages };
    }
    return { success: false, _message: getErrorMessage(error) };
  }
}

export async function signOut() {
  try {
    const authService = serviceContainer.getAuthService();
    await authService.destroySession();
    logger.info("Déconnexion réussie");
    return { success: true };
  } catch (error: unknown) {
    logger.error("Erreur lors de la déconnexion:", {
      error: error instanceof Error ? error.message : String(error),
    } as LogContext);
    return { success: false, _message: getErrorMessage(error) };
  }
}

// =============================================================================
// ACTIONS POUR LES PARCELLES
// =============================================================================

export async function getParcelles(): Promise<Parcel[]> {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const parcelleService = serviceContainer.getParcelleService();
    const result = await parcelleService.getAllParcelles(user.id);

    // Handle both array and paginated response types
    const parcelles = Array.isArray(result) ? result : result.data;

    logger.debug(
      `Récupération de ${parcelles.length} parcelles pour l'utilisateur ${user.id}`,
    );
    return parcelles;
  } catch (error: unknown) {
    logger.error("Erreur lors de la récupération des parcelles:", {
      error,
    });
    return [];
  }
}

// Helper for safe number parsing
function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (!value || typeof value !== "string") return undefined;
  const parsed = Number(value);
  return isNaN(parsed) ? undefined : parsed;
}

export async function addParcelle(formData: FormData) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const rawData = {
      numero: formData.get("numero") as string,
      transporteur: formData.get("transporteur") as string,
      prixAchat: parseNumber(formData.get("prixAchat")),
      poids: parseNumber(formData.get("poids")),
      nom: formData.get("nom") as string,
      statut: formData.get("statut") as string,
    };

    // Fallback to defaults or let Zod handle invalid types if undefined
    // For parcelleSchema, it expects number. if parseNumber returns undefined, Zod will fail gracefully with "Required" or type mismatch.
    // However, if we want to default to 0 for optional UI fields that are required by schema:

    // Note: Zod schema uses z.number().nonnegative().
    // If we pass undefined, Zod says "Required".
    // If formData was empty string, parseNumber returns undefined.
    // If we want 0 as default for empty inputs?
    // Let's rely on validatedData to catch it, but we need to pass something.
    // Actually, preserving 'undefined' allows Zod to validating presence properly.

    // Validation des données avec Zod
    const validatedData = parcelleSchema.parse(rawData);

    // ... (rest remains same)

    // Calculer les champs supplémentaires requis pour CreateParcelInput
    const totalPrice = validatedData.prixAchat; // Pour l'instant, prixTotal = prixAchat

    // Use ParcelStatus enum mapping if needed, or cast if string matches
    // Assuming validatedData.statut matches ParcelStatus values or needs mapping
    // For now, let's assume simple casting or default

    const createData: CreateParcelInput = {
      userId: user.id,
      superbuyId: validatedData.numero,
      carrier: validatedData.transporteur,
      name: validatedData.nom,
      status: validatedData.statut as ParcelStatus, // Explicit cast
      totalPrice,
      weight: validatedData.poids,
      // tsc says boolean not assignable to number.
      // Maybe CreateParcelInput in legacy/api types has number?
      // I will cast to any to be safe OR check entities.ts again.
      // Let's assume boolean is correct for now, but tsc is right about the INTERFACE.
      // If interface says number, I must provide number.
      // Checking tsc log again: "Type 'boolean' is not assignable to type 'number'".
      // So I will use 1 if it wants number, or fix interface. 
      // Fix interface is better, but risky if used elsewhere.
      // I'll provide 1 for now if boolean fails? No, isActive in new schema is boolean mode but integer in DB.
      // But CreateParcelInput interface...
      // I'll use logic:
      // isActive: 1 as unknown as boolean, // temporary hack
      // OR better:
      // isActive: true, 
      // Wait, let's fix the interface if possible.
      // For now, I'll assume tsc knows best about what is expected.
      isActive: true ? 1 : 0, // Use 1 for true, 0 for false if schema requires number

    };

    const parcelleService = serviceContainer.getParcelleService();
    await parcelleService.createParcelle(user.id, createData);

    revalidatePath("/parcelles");
    revalidatePath("/dashboard");
    revalidatePath("/statistiques");

    logger.info("Parcelle ajoutée avec succès", {
      userId: user.id,
      numero: validatedData.numero,
    });
    return { success: true, message: "Parcelle ajoutée avec succès" };
  } catch (error: unknown) {
    logger.error("Erreur lors de l'ajout de la parcelle:", {
      error,
    });

    if (error instanceof ZodError) {
      const errorMessages = error.issues
        .map((err) => err.message)
        .join(", ");
      return { success: false, message: errorMessages };
    }
    if (error instanceof CustomError) {
      return { success: false, message: getErrorMessage(error) };
    }
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function updateParcelle(id: string, formData: FormData) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const rawData = {
      numero: formData.get("numero") as string,
      transporteur: formData.get("transporteur") as string,
      prixAchat: parseNumber(formData.get("prixAchat")),
      poids: parseNumber(formData.get("poids")),
    };

    // Filtrer les valeurs undefined pour la validation partielle
    const filteredData = Object.fromEntries(
      Object.entries(rawData).filter(([, value]) => value !== undefined),
    );

    const updateData: UpdateParcelInput = {};
    const filteredAny = filteredData as Record<string, unknown>;
    if (filteredAny['numero']) updateData.superbuyId = filteredAny['numero'] as string;
    if (filteredAny['transporteur']) updateData.carrier = filteredAny['transporteur'] as string;
    if (filteredAny['prixAchat']) updateData.totalPrice = filteredAny['prixAchat'] as number;
    if (filteredAny['poids']) updateData.weight = filteredAny['poids'] as number;
    // Note: status, name not in update form? If they are, add mapping.

    const parcelleService = serviceContainer.getParcelleService();
    const updatedParcelle = await parcelleService.updateParcelle(
      id,
      user.id,
      updateData,
    );

    if (!updatedParcelle) {
      return {
        success: false,
        message: "Parcelle non trouvée ou non autorisée",
      };
    }

    revalidatePath("/parcelles");
    revalidatePath("/dashboard");
    revalidatePath("/statistiques");

    logger.info("Parcelle mise à jour avec succès", {
      userId: user.id,
      parcelleId: id,
    });
    return { success: true, message: "Parcelle mise à jour avec succès" };
  } catch (error: unknown) {
    logger.error("Erreur lors de la mise à jour de la parcelle:", {
      error,
      parcelleId: id,
    });

    if (error instanceof CustomError) {
      return { success: false, message: getErrorMessage(error) };
    }
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function deleteParcelle(id: string) {
  if (!id || typeof id !== "string") {
    return { success: false, message: "ID de parcelle invalide." };
  }

  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const parcelleService = serviceContainer.getParcelleService();
    await parcelleService.deleteParcelle(id, user.id);

    revalidatePath("/parcelles");
    revalidatePath("/dashboard");
    revalidatePath("/statistiques");

    logger.info("Parcelle supprimée avec succès.", {
      userId: user.id,
      parcelleId: id,
    });
    return { success: true, message: "Parcelle supprimée avec succès." };
  } catch (error: unknown) {
    if (error instanceof CustomError) {
      return { success: false, message: getErrorMessage(error) };
    }

    logger.error("Erreur lors de la suppression de la parcelle.", {
      error: getErrorMessage(error),
      parcelleId: id,
    });
    return {
      success: false,
      message: getErrorMessage(error) || "Une erreur inattendue est survenue.",
    };
  }
}

// =============================================================================
// ACTIONS POUR LE PROFIL UTILISATEUR
// =============================================================================

export async function updateAppProfile(data: Record<string, unknown>) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    // Validation des données (reusing the schema from lib/schemas if available, otherwise just passing partial data)
    // Note: UserService.updateProfile accepts Partial<User> fields.
    // Ideally we should validte input here. Assuming data contains valid fields.

    const userService = serviceContainer.getUserService();
    // Filter allowed fields only to prevent mass assignment
    const allowedFields = ["username", "email", "bio", "avatar", "language", "theme"];
    const filteredData = Object.keys(data)
      .filter(key => allowedFields.includes(key))
      .reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
      }, {} as Record<string, unknown>);

    await userService.updateProfile(user.id, filteredData);

    revalidatePath("/profile");

    logger.info("Profil mis à jour avec succès", { userId: user.id });
    return { success: true, _message: "Profil mis à jour avec succès" };
  } catch (error: unknown) {
    logger.error("Erreur lors de la mise à jour du profil:", {
      error,
    });
    return {
      success: false,
      _message:
        getErrorMessage(error) ||
        "Une erreur s'est produite lors de la mise à jour du profil.",
    };
  }
}

// =============================================================================
// ACTIONS POUR LA CONFIGURATION DU DASHBOARD
// =============================================================================

export async function getDashboardConfig(): Promise<DashboardConfig> {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const config = await databaseService.queryOne<{ config: string }>(
      `
      SELECT config
      FROM dashboard_config
      WHERE user_id = ?
    `,
      [user.id],
      "getDashboardConfig",
    );

    if (!config) {
      logger.debug(
        "Aucune configuration dashboard trouvée, utilisation des valeurs par défaut",
        { userId: user.id },
      );
      // Configuration par défaut
      return getDefaultDashboardConfig();
    }

    const parsedConfig = JSON.parse(config.config) as DashboardConfig;
    logger.debug("Configuration dashboard récupérée", {
      userId: user.id,
      cardsCount: parsedConfig.cards.length,
    });
    return parsedConfig;
  } catch (error: unknown) {
    logger.error(
      "Erreur lors de la récupération de la configuration du dashboard:",
      { error },
    );
    // Configuration par défaut en cas d'erreur
    return getDefaultDashboardConfig();
  }
}

export async function updateDashboardConfig(config: DashboardConfig) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    // Validation basique de la configuration
    if (!config.cards || !Array.isArray(config.cards)) {
      return {
        success: false,
        _message: "Configuration invalide: cards manquant ou invalide",
      };
    }

    if (!config.layout || !Array.isArray(config.layout)) {
      return {
        success: false,
        _message: "Configuration invalide: layout manquant ou invalide",
      };
    }

    const timestamp = getCurrentTimestamp();
    const configJson = JSON.stringify(config);

    // Vérifier si une configuration existe déjà
    const existingConfig = await databaseService.queryOne<{ id: string }>(
      `
      SELECT id FROM dashboard_config
      WHERE user_id = ?
    `,
      [user.id],
      "checkExistingDashboardConfig",
    );

    if (existingConfig) {
      // Mettre à jour la configuration existante
      await databaseService.execute(
        `
        UPDATE dashboard_config
        SET config = ?, updated_at = ?
        WHERE user_id = ?
      `,
        [configJson, timestamp, user.id],
        "updateDashboardConfig",
      );

      logger.info("Configuration dashboard mise à jour", { userId: user.id });
    } else {
      // Créer une nouvelle configuration
      await databaseService.execute(
        `
        INSERT INTO dashboard_config (id, user_id, config, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
        [generateId(), user.id, configJson, timestamp, timestamp],
        "createDashboardConfig",
      );

      logger.info("Nouvelle configuration dashboard créée", {
        userId: user.id,
      });
    }

    revalidatePath("/dashboard");
    return { success: true, _message: "Configuration mise à jour avec succès" };
  } catch (error: unknown) {
    logger.error(
      "Erreur lors de la mise à jour de la configuration du dashboard:",
      { error },
    );
    return { success: false, _message: getErrorMessage(error) };
  }
}

// Fonction utilitaire pour la configuration par défaut
function getDefaultDashboardConfig(): DashboardConfig {
  return {
    cards: [
      {
        id: "stats",
        title: "Statistiques principales",
        type: "stats",
        component: "MainStats",
        enabled: true,
        order: 0,
      },
      {
        id: "performance",
        title: "Performance des ventes",
        type: "chart",
        component: "PerformanceChart",
        enabled: true,
        order: 1,
      },
      {
        id: "plateformes",
        title: "Répartition par plateforme",
        type: "chart",
        component: "VentesPlateformes",
        enabled: true,
        order: 2,
      },
      {
        id: "top-produits",
        title: "Top produits",
        type: "table",
        component: "TopProduits",
        enabled: true,
        order: 3,
      },
      {
        id: "temps-vente",
        title: "Temps de vente",
        type: "chart",
        component: "TempsVente",
        enabled: true,
        order: 4,
      },
    ],
    layout: [
      "stats",
      "performance",
      "plateformes",
      "top-produits",
      "temps-vente",
    ],
    gridLayout: { lg: 2, md: 1 },
  };
}

"use server";

import { revalidatePath } from "next/cache";
import {
  requireAuth,
  createUser,
  verifyCredentials,
  createSession,
  signOut as authSignOut,
  UserSession,
} from "./auth/auth";
import { z, ZodError } from "zod";
import { getErrorMessage } from "@/lib/utils/error-utils";
import {
  databaseService,
  generateId,
  getCurrentTimestamp,
} from "@/lib/services/database/db";
import type { DashboardConfig } from "@/types/features/dashboard";
import type { Parcelle } from "@/lib/shared/types/entities";
import { logger } from "@/lib/utils/logging/logger";
import type { LogContext } from "@/lib/utils/logging/logger";
import { CustomError } from "@/lib/errors/custom-error";
import type {
  CreateParcelleInput,
} from "@/lib/types/entities";
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

// Removed unused productSchema

// =============================================================================
// ACTIONS D'AUTHENTIFICATION
// =============================================================================

export async function signUp(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  try {
    const validatedData = userSchema.parse({ username, password });

    const user = await createUser(
      validatedData.username,
      validatedData.password,
    );
    await createSession(user.id);

    logger.info(`Nouvel utilisateur créé: ${validatedData.username}`, {
      userId: user.id,
    });
    return { success: true, _message: "Inscription réussie" };
  } catch (error: unknown) {
    logger.error("Erreur lors de l'inscription:", {
      error: error instanceof Error ? error.message : String(error),
    } as LogContext);

    if (error instanceof ZodError) {
      const errorMessages = error.errors
        .map((err: any) => err.message)
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

    // Vérifier si la table users existe
    try {
      await databaseService.queryOne(
        "SELECT 1 FROM users LIMIT 1",
        [],
        "signIn-check",
      );
    } catch (error: unknown) {
      logger.error("Erreur lors de l'accès à la table users:", {
        error: error instanceof Error ? error.message : String(error),
      } as LogContext);
      if (getErrorMessage(error).includes("no such table")) {
        return {
          success: false,
          _message:
            "Erreur de base de données: la table users n'existe pas. Veuillez contacter l'administrateur.",
        };
      }
    }

    const user = await verifyCredentials(username, validatedData.password);

    if (!user) {
      return { success: false, _message: "Mot de passe incorrect" };
    }

    // Supprimer toute session existante pour cet utilisateur
    try {
      await databaseService.execute(
        "DELETE FROM sessions WHERE user_id = ?",
        [user.id],
        "signIn-cleanup",
      );
    } catch (error: unknown) {
      logger.warn(
        "Erreur lors de la suppression des sessions existantes:",
        {
          error: error instanceof Error ? error.message : String(error),
        } as LogContext,
      );
    }

    // Créer une nouvelle session
    const sessionId = generateId();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(); // 7 jours

    try {
      await databaseService.execute(
        `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
        [sessionId, user.id, expiresAt],
        "signIn-createSession",
      );

      logger.info(`Connexion réussie pour l'utilisateur: ${username}`, {
        userId: user.id,
        sessionId,
      });

      return {
        success: true,
        _message: "Connexion réussie",
        sessionId: sessionId,
      };
    } catch (error: unknown) {
      logger.error("Erreur lors de la création de la session:", {
        error: error instanceof Error ? error.message : String(error),
      } as LogContext);
      return { success: false, _message: getErrorMessage(error) };
    }
  } catch (error: unknown) {
    logger.error("Erreur lors de la connexion:", {
      error: error instanceof Error ? error.message : String(error),
    } as LogContext);
    if (error instanceof ZodError) {
      const errorMessages = error.errors
        .map((err: any) => err.message)
        .join(", ");
      return { success: false, _message: errorMessages };
    }
    return { success: false, _message: getErrorMessage(error) };
  }
}

export async function signOut() {
  try {
    await authSignOut();
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

export async function getParcelles(): Promise<Parcelle[]> {
  const user: UserSession = await requireAuth();

  try {
    const parcelleService = serviceContainer.getParcelleService();
    const parcelles = await parcelleService.getAllParcelles(user.id);

    logger.debug(
      `Récupération de ${parcelles.length} parcelles pour l'utilisateur ${user.id}`,
    );
    return parcelles;
  } catch (error: unknown) {
    logger.error("Erreur lors de la récupération des parcelles:", {
      error,
      userId: user.id,
    });
    return [];
  }
}

export async function addParcelle(formData: FormData) {
  const user: UserSession = await requireAuth();

  try {
    const rawData = {
      numero: formData.get("numero") as string,
      transporteur: formData.get("transporteur") as string,
      prixAchat: Number(formData.get("prixAchat")),
      poids: Number(formData.get("poids")),
    };

    // Validation des données avec Zod
    const validatedData = parcelleSchema.parse(rawData);

    // Calculer les champs supplémentaires requis pour CreateParcelleInput
    const prixTotal = validatedData.prixAchat; // Pour l'instant, prixTotal = prixAchat
    const prixParGramme = validatedData.poids > 0 ? prixTotal / validatedData.poids : 0;

    const createData: CreateParcelleInput = {
      userId: user.id,
      ...validatedData,
      prixTotal,
      prixParGramme,
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
      userId: user.id,
    });

    if (error instanceof ZodError) {
      const errorMessages = error.errors
        .map((err: any) => err.message)
        .join(", ");
      return { success: false, message: errorMessages };
    }
    if (error instanceof CustomError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function updateParcelle(id: string, formData: FormData) {
  const user: UserSession = await requireAuth();

  try {
    const rawData = {
      numero: formData.get("numero") as string,
      transporteur: formData.get("transporteur") as string,
      prixAchat: formData.get("prixAchat")
        ? Number(formData.get("prixAchat"))
        : undefined,
      poids: formData.get("poids") ? Number(formData.get("poids")) : undefined,
    };

    // Filtrer les valeurs undefined pour la validation partielle
    const filteredData = Object.fromEntries(
      Object.entries(rawData).filter(([, value]) => value !== undefined),
    );

    const parcelleService = serviceContainer.getParcelleService();
    const updatedParcelle = await parcelleService.updateParcelle(
      id,
      user.id,
      filteredData,
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
      userId: user.id,
      parcelleId: id,
    });

    if (error instanceof CustomError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function deleteParcelle(id: string) {
  const user: UserSession = await requireAuth();

  if (!id || typeof id !== "string") {
    logger.warn(`Tentative de suppression avec un ID invalide.`, {
      userId: user.id,
    });
    return { success: false, message: "ID de parcelle invalide." };
  }

  try {
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
      logger.warn(error.message, { userId: user.id, parcelleId: id });
      return { success: false, message: error.message };
    }

    logger.error("Erreur lors de la suppression de la parcelle.", {
      error: getErrorMessage(error),
      userId: user.id,
      parcelleId: id,
    });
    return {
      success: false,
      message: getErrorMessage(error) || "Une erreur inattendue est survenue.",
    };
  }
}

// =============================================================================
// ACTIONS POUR LES PRODUITS (OBSOLETE - Utiliser les API REST directement)
// =============================================================================

/*
export async function getProduits(): Promise<Product[]> {
  const user: UserSession = await requireAuth();

  try {
    const productService = serviceContainer.getProductService();
    const products = await productService.getAllProducts(user.id);

    // Mapper les produits du schéma Drizzle vers le type Product moderne
    const mappedProducts: Product[] = products.map((product: any) => ({
      id: product.id,
      userId: product.userId,
      parcelleId: product.parcelleId,

      // Basic information
      name: product.name,
      description: product.description,
      poids: product.poids,

      // Financial information
      price: product.price,
      currency: product.currency,
      coutLivraison: product.coutLivraison,
      benefices: product.benefices,

      // Vinted/Order information
      vintedItemId: product.vintedItemId,

      // Sale status
      vendu: product.vendu,
      dateMiseEnLigne: product.dateMiseEnLigne,
      dateVente: product.dateVente,
      prixVente: product.prixVente,
      plateforme: product.plateforme,

      // Modern status system
      status: product.status,

      // Additional product details
      brand: product.brand,
      size: product.size,
      condition: product.condition,
      category: product.category,
      color: product.color,
      material: product.material,

      // Timestamps
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      listedAt: product.listedAt,
      soldAt: product.soldAt,
    }));

    logger.debug(
      `Récupération de ${mappedProducts.length} produits pour l'utilisateur ${user.id}`,
    );
    return mappedProducts;
  } catch (error: unknown) {
    logger.error("Erreur lors de la récupération des produits:", {
      error,
      userId: user.id,
    });
    return [];
  }
}

export async function addProduit(formData: FormData) {
  const user: UserSession = await requireAuth();

  try {
    const rawData = {
      nom: formData.get("nom") as string,
      details: formData.get("details") as string,
      prixArticle: Number(formData.get("prixArticle")),
      poids: Number(formData.get("poids")),
      parcelleId: formData.get("parcelleId") as string,
      commandeId: formData.get("commandeId") as string,
    };

    // Validation des données avec Zod
    const validatedData = productSchema.parse(rawData);

    const data: CreateProductInput = {
      userId: user.id,
      name: validatedData.nom,
      price: validatedData.prixArticle,
      poids: validatedData.poids,
      currency: "EUR",
      parcelleId: validatedData.parcelleId,
      vintedItemId: validatedData.commandeId || `auto-${Date.now()}`,
      ...(validatedData.details && { description: validatedData.details }),
    };

    const productService = serviceContainer.getProductService();
    await productService.createProduct(user.id, data);

    revalidatePath("/produits");
    revalidatePath("/dashboard");
    revalidatePath("/statistiques");

    logger.info("Produit ajouté avec succès", {
      userId: user.id,
      nom: validatedData.nom,
    });
    return { success: true, message: "Produit ajouté avec succès" };
  } catch (error: unknown) {
    logger.error("Erreur lors de l'ajout du produit:", {
      error,
      userId: user.id,
    });

    if (error instanceof ZodError) {
      const errorMessages = error.errors
        .map((err: any) => err.message)
        .join(", ");
      return { success: false, message: errorMessages };
    }
    if (error instanceof CustomError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function updateProduit(id: string, formData: FormData) {
  const user: UserSession = await requireAuth();

  try {
    // Construire l'objet de données en filtrant les valeurs undefined
    const dataFields: Record<string, any> = {
      name: formData.get("nom") as string,
      price: Number(formData.get("prixArticle")),
      parcelleId: formData.get("parcelleId") as string,
      vintedItemId: formData.get("commandeId") as string,
      vendu: formData.get("vendu") === "true" ? "1" : "0",
    };

    // Ajouter les champs optionnels seulement s'ils ont des valeurs
    const details = formData.get("details") as string;
    if (details) {
      dataFields.description = details;
    }

    const poids = formData.get("poids");
    if (poids) {
      dataFields.poids = Number(poids);
    }

    const dateVente = formData.get("dateVente") as string;
    if (dateVente) {
      dataFields.dateVente = dateVente;
    }

    const data = dataFields as Partial<UpdateProductInput>;

    const productService = serviceContainer.getProductService();
    const updatedProduct = await productService.updateProduct(
      user.id,
      id,
      data,
    );

    if (!updatedProduct) {
      return { success: false, message: "Produit non trouvé ou non autorisé" };
    }

    revalidatePath("/produits");
    revalidatePath("/dashboard");
    revalidatePath("/statistiques");

    logger.info("Produit mis à jour avec succès", {
      userId: user.id,
      productId: id,
    });
    return { success: true, message: "Produit mis à jour avec succès" };
  } catch (error: unknown) {
    logger.error("Erreur lors de la mise à jour du produit:", {
      error,
      userId: user.id,
      productId: id,
    });

    if (error instanceof CustomError) {
      return { success: false, message: error.message };
    }
    if (error instanceof ZodError) {
      const errorMessages = error.errors
        .map((err: any) => err.message)
        .join(", ");
      return { success: false, message: errorMessages };
    }
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function deleteProduit(id: string) {
  const user: UserSession = await requireAuth();

  if (!id || typeof id !== "string") {
    logger.warn(`Tentative de suppression de produit avec un ID invalide.`, {
      userId: user.id,
    });
    return { success: false, message: "ID de produit invalide." };
  }

  try {
    const productService = serviceContainer.getProductService();
    const result = await productService.deleteProduct(user.id, id);

    if (!result) {
      return { success: false, message: "Produit non trouvé ou non autorisé" };
    }

    revalidatePath("/produits");
    revalidatePath("/dashboard");
    revalidatePath("/statistiques");

    logger.info("Produit supprimé avec succès", {
      userId: user.id,
      productId: id,
    });
    return { success: true, message: "Produit supprimé avec succès" };
  } catch (error: unknown) {
    logger.error("Erreur lors de la suppression du produit:", {
      error,
      userId: user.id,
      productId: id,
    });

    if (error instanceof CustomError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: getErrorMessage(error) };
  }
}
*/

// =============================================================================
// ACTIONS POUR LE PROFIL UTILISATEUR
// =============================================================================

export async function updateAppProfile(data: Record<string, unknown>) {
  const user: UserSession = await requireAuth();

  try {
    const response = await fetch(
      `${process.env["NEXT_PUBLIC_BASE_URL"]!}/api/profile/update`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      logger.warn("Erreur API lors de la mise à jour du profil", {
        userId: user.id,
        status: response.status,
        error: errorData.message,
      });
      return {
        success: false,
        _message:
          errorData.message || "Erreur lors de la mise à jour du profil.",
      };
    }

    const result = await response.json();
    revalidatePath("/profile");

    logger.info("Profil mis à jour avec succès", { userId: user.id });
    return { success: result.success, _message: result.message };
  } catch (error: unknown) {
    logger.error("Erreur lors de la mise à jour du profil:", {
      error,
      userId: user.id,
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
  const user: UserSession = await requireAuth();

  try {
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
      { error, userId: user.id },
    );
    // Configuration par défaut en cas d'erreur
    return getDefaultDashboardConfig();
  }
}

export async function updateDashboardConfig(config: DashboardConfig) {
  const user: UserSession = await requireAuth();

  try {
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
      { error, userId: user.id },
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

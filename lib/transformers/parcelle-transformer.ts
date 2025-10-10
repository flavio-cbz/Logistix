/**
 * Parcelle data transformation utilities
 * Handles conversion between frontend form data and backend API formats
 */

import { z } from "zod";
import {
  Parcelle,
  CreateParcelleInput,
  UpdateParcelleInput,
} from "../types/entities";
import {
  ParcelleFormData,
  CreateParcelleFormData,
  UpdateParcelleFormData,
} from "../schemas/parcelle";
import {
  transformStringToNumber,
  sanitizeString,
  validateTransformedData,
  removeUndefinedValues,
  deepClone,
} from "./common-transformer";

/**
 * Transforms database parcelle result to Parcelle entity
 * Handles SQLite INTEGER to boolean conversion for actif field
 */
export function transformDbParcelleToEntity(dbParcelle: any): Parcelle {
  if (!dbParcelle) {
    throw new Error('dbParcelle is null or undefined');
  }

  return {
    id: dbParcelle.id,
    userId: dbParcelle.userId,
    numero: dbParcelle.numero,
    transporteur: dbParcelle.transporteur,
    nom: dbParcelle.nom,
    statut: dbParcelle.statut,
    actif: Boolean(dbParcelle.actif ?? true), // Convert SQLite INTEGER (0/1) to boolean, default to true
    prixAchat: dbParcelle.prixAchat,
    poids: dbParcelle.poids,
    prixTotal: dbParcelle.prixTotal,
    prixParGramme: dbParcelle.prixParGramme,
    createdAt: dbParcelle.createdAt,
    updatedAt: dbParcelle.updatedAt,
  };
}

/**
 * Transforms frontend form data to backend API format for parcelle creation
 */
export function transformParcelleFormToCreateInput(
  formData: CreateParcelleFormData,
): CreateParcelleInput {
  const clonedData = deepClone(formData);

  // Transform form data to match backend expectations
  const prixAchat =
    typeof clonedData.prixAchat === "string"
      ? transformStringToNumber(clonedData.prixAchat)
      : clonedData.prixAchat;
  const poids =
    typeof clonedData.poids === "string"
      ? transformStringToNumber(clonedData.poids)
      : clonedData.poids;

  const transformed: CreateParcelleInput = {
    userId: "", // Will be set by backend
    numero: sanitizeString(clonedData.numero) || "",
    transporteur: sanitizeString(clonedData.transporteur) || "",
    nom: sanitizeString(clonedData.nom) || "",
    statut: sanitizeString(clonedData.statut) || "",
    prixAchat,
    poids,
    // Calculate derived fields
    prixTotal: prixAchat,
    prixParGramme: prixAchat / poids,
  };

  // Remove undefined values
  return removeUndefinedValues(transformed) as CreateParcelleInput;
}

/**
 * Transforms frontend form data to backend API format for parcelle updates
 */
export function transformParcelleFormToUpdateInput(
  formData: UpdateParcelleFormData,
): UpdateParcelleInput {
  const clonedData = deepClone(formData);

  const transformed: UpdateParcelleInput = {
    numero: sanitizeString(clonedData.numero) || "",
    transporteur: sanitizeString(clonedData.transporteur) || "",
    nom: sanitizeString(clonedData.nom) || "",
    statut: sanitizeString(clonedData.statut) || "",
    prixAchat: clonedData.prixAchat
      ? typeof clonedData.prixAchat === "string"
        ? transformStringToNumber(clonedData.prixAchat)
        : clonedData.prixAchat
      : 0,
    poids: clonedData.poids
      ? typeof clonedData.poids === "string"
        ? transformStringToNumber(clonedData.poids)
        : clonedData.poids
      : 0,
  };

  // Recalculate derived fields if base values are provided
  if (transformed.prixAchat !== undefined && transformed.poids !== undefined) {
    transformed.prixTotal = transformed.prixAchat;
    transformed.prixParGramme = transformed.prixAchat / transformed.poids;
  }

  // Remove undefined values
  return removeUndefinedValues(transformed) as UpdateParcelleInput;
}

/**
 * Transforms backend API response to frontend form data format
 */
export function transformParcelleApiToFormData(
  parcelle: Parcelle,
): ParcelleFormData {
  return {
    numero: parcelle.numero,
    transporteur: parcelle.transporteur,
    nom: parcelle.nom,
    statut: parcelle.statut,
    prixAchat: parcelle.prixAchat ?? 0,
    poids: parcelle.poids ?? 0,
    prixTotal: parcelle.prixTotal ?? undefined,
    prixParGramme: parcelle.prixParGramme ?? undefined,
    userId: parcelle.userId,
  };
}

/**
 * Transforms legacy API format to modern Parcelle format
 */
export function transformLegacyParcelleToModern(legacyParcelle: any): Parcelle {
  const prixAchat = legacyParcelle.prixAchat || legacyParcelle.prix || 0;
  const poids = legacyParcelle.poids || legacyParcelle.weight || 1;

  return {
    id: legacyParcelle.id,
    userId: legacyParcelle.userId,
    numero: legacyParcelle.numero || legacyParcelle.number || "",
    transporteur: legacyParcelle.transporteur || legacyParcelle.carrier || "",
    nom: legacyParcelle.nom || `${legacyParcelle.transporteur || legacyParcelle.carrier || ""} - ${legacyParcelle.numero || legacyParcelle.number || ""}`,
    statut: legacyParcelle.statut || "En attente",
    actif: Boolean(legacyParcelle.actif ?? true), // Convert SQLite INTEGER (0/1) to boolean, default to true
    prixAchat,
    poids,
    prixTotal: legacyParcelle.prixTotal || prixAchat,
    prixParGramme: legacyParcelle.prixParGramme || prixAchat / poids,
    createdAt: legacyParcelle.createdAt || new Date().toISOString(),
    updatedAt: legacyParcelle.updatedAt,
  };
}

/**
 * Calculates derived fields for parcelle data
 */
export function calculateParcelleFields(
  prixAchat: number,
  poids: number,
): {
  prixTotal: number;
  prixParGramme: number;
} {
  if (poids <= 0) {
    throw new Error(
      "Le poids doit être supérieur à 0 pour calculer le prix par gramme",
    );
  }

  return {
    prixTotal: prixAchat,
    prixParGramme: prixAchat / poids,
  };
}

/**
 * Validates parcelle transformation result
 */
export function validateParcelleTransformation<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  operation: string,
): T {
  return validateTransformedData(data, schema, `parcelle ${operation}`);
}

/**
 * Formats parcelle display data for UI components
 */
export function formatParcelleForDisplay(parcelle: Parcelle): {
  numero: string;
  transporteur: string;
  prixAchat: string;
  poids: string;
  prixTotal: string;
  prixParGramme: string;
  createdAt: string;
} {
  return {
    numero: parcelle.numero,
    transporteur: parcelle.transporteur,
    prixAchat: parcelle.prixAchat?.toFixed(2) + " €" || "0.00 €",
    poids: (parcelle.poids ?? 0).toFixed(0) + " g",
    prixTotal: (parcelle.prixTotal ?? 0).toFixed(2) + " €",
    prixParGramme: (parcelle.prixParGramme ?? 0).toFixed(3) + " €/g",
    createdAt: new Date(parcelle.createdAt).toLocaleDateString("fr-FR"),
  };
}

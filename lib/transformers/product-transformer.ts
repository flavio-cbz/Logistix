/**
 * Product data transformation utilities
 * Handles conversion between frontend form data and backend API formats
 */

import { z } from "zod";
import {
  ProductStatus,
  Product,
  CreateProductInput,
  UpdateProductInput,
} from "../types/entities";
import {
  ProductFormData,
  CreateProductFormData,
  UpdateProductFormData,
} from "../schemas/product";
import {
  transformStringToNumber,
  sanitizeString,
  transformDateForApi,
  transformDateForDisplay,
  validateTransformedData,
  removeUndefinedValues,
  deepClone,
} from "./common-transformer";

/**
 * Transforms frontend form data to backend API format for product creation
 */
export function transformProductFormToCreateInput(
  formData: CreateProductFormData,
): CreateProductInput {
  const clonedData = deepClone(formData);

  // Transform form data to match backend expectations
  const transformed = {
    userId: "", // Will be set by backend
    name: sanitizeString(clonedData.name) || "",
    brand: sanitizeString(clonedData.brand) || undefined,
    category: sanitizeString(clonedData.category) || undefined,
    subcategory: sanitizeString(clonedData.subcategory) || undefined,
    size: sanitizeString(clonedData.size) || undefined,
    color: sanitizeString(clonedData.color) || undefined,

    // Transform numeric fields
    poids:
      typeof clonedData.poids === "string"
        ? transformStringToNumber(clonedData.poids)
        : clonedData.poids || 0,
    price:
      typeof clonedData.price === "string"
        ? transformStringToNumber(clonedData.price)
        : clonedData.price,
    prixVente: clonedData.prixVente
      ? typeof clonedData.prixVente === "string"
        ? transformStringToNumber(clonedData.prixVente)
        : clonedData.prixVente
      : undefined,

    // Other fields
    currency: clonedData.currency || "EUR",
    coutLivraison: clonedData.coutLivraison || undefined,
    parcelleId: clonedData.parcelleId || undefined,
    vintedItemId: sanitizeString(clonedData.vintedItemId) || undefined,
    url: sanitizeString(clonedData.url) || undefined,
    photoUrl: sanitizeString(clonedData.photoUrl) || undefined,

    // Status and platform
    status: clonedData.status || ProductStatus.DRAFT,
    plateforme: clonedData.plateforme || undefined,

    // Legacy compatibility
    vendu: clonedData.vendu || "0",
    dateMiseEnLigne: transformDateForApi(clonedData.dateMiseEnLigne) || undefined,
    dateVente: transformDateForApi(clonedData.dateVente) || undefined,
  } as CreateProductInput;

  // Remove undefined values to avoid sending unnecessary data
  return removeUndefinedValues(transformed) as CreateProductInput;
}

/**
 * Transforms frontend form data to backend API format for product updates
 */
export function transformProductFormToUpdateInput(
  formData: UpdateProductFormData,
): UpdateProductInput {
  const transformed = {
    name: sanitizeString(formData.name),
    brand: sanitizeString(formData.brand),
    category: sanitizeString(formData.category),
    subcategory: sanitizeString(formData.subcategory),
    size: sanitizeString(formData.size),
    color: sanitizeString(formData.color),

    // Transform numeric fields
    poids:
      typeof formData.poids === "string"
        ? transformStringToNumber(formData.poids)
        : formData.poids,
    price:
      typeof formData.price === "string"
        ? transformStringToNumber(formData.price)
        : formData.price,
    prixVente: formData.prixVente
      ? typeof formData.prixVente === "string"
        ? transformStringToNumber(formData.prixVente)
        : formData.prixVente
      : undefined,

    // Other fields
    currency: formData.currency || "EUR",
    coutLivraison: formData.coutLivraison,
    parcelleId: formData.parcelleId,
    vintedItemId: sanitizeString(formData.vintedItemId),
    url: sanitizeString(formData.url),
    photoUrl: sanitizeString(formData.photoUrl),

    // Status and platform
    status: formData.status || ProductStatus.DRAFT,
    plateforme: formData.plateforme,

    // Legacy compatibility
    vendu: formData.vendu || "0",
    dateMiseEnLigne: transformDateForApi(formData.dateMiseEnLigne),
    dateVente: transformDateForApi(formData.dateVente),
  } as UpdateProductInput;  // Remove undefined values
  return removeUndefinedValues(transformed) as UpdateProductInput;
}

/**
 * Transforms backend API response to frontend form data format
 */
export function transformProductApiToFormData(
  product: Product,
): ProductFormData {
  return {
    name: product.name,
    brand: product.brand ?? "",
    category: product.category ?? "",
    subcategory: product.subcategory ?? undefined,
    size: product.size ?? undefined,
    color: product.color ?? undefined,

    // Transform numeric fields to strings for form compatibility
    poids: product.poids,
    price: product.price,
    prixVente: product.prixVente ?? undefined,

    // Other fields
    currency: product.currency || "EUR",
    coutLivraison: product.coutLivraison ?? undefined,
    parcelleId: product.parcelleId ?? undefined,
    vintedItemId: product.vintedItemId ?? undefined,
    url: product.url ?? undefined,
    photoUrl: product.photoUrl ?? undefined,

    // Status and platform
    status: product.status || ProductStatus.DRAFT,
    plateforme: product.plateforme ?? undefined,

    // Legacy compatibility
    vendu: product.vendu || "0",
    dateMiseEnLigne: transformDateForDisplay(product.dateMiseEnLigne ?? undefined),
    dateVente: transformDateForDisplay(product.dateVente ?? undefined),

    // System fields
    userId: product.userId,
    soldAt: product.soldAt ?? undefined,
  };
}

/**
 * Transforms legacy API format to modern Product format
 */
export function transformLegacyProductToModern(legacyProduct: any): Product {
  return {
    id: legacyProduct.id,
    userId: legacyProduct.userId,
    parcelleId: legacyProduct.parcelleId,

    // Map legacy field names to modern ones
    name: legacyProduct.nom || legacyProduct.name || legacyProduct.title,
    brand: legacyProduct.marque || legacyProduct.brand,
    category: legacyProduct.categorie || legacyProduct.category,
    subcategory: legacyProduct.sousCategorie || legacyProduct.subcategory,

    // Physical properties
    size: legacyProduct.taille || legacyProduct.size,
    color: legacyProduct.couleur || legacyProduct.color,

    // Pricing and weight
    poids: legacyProduct.poids || legacyProduct.weight || 0,
    price:
      legacyProduct.prix ||
      legacyProduct.price ||
      legacyProduct.purchasePrice ||
      0,
    currency: legacyProduct.devise || legacyProduct.currency || "EUR",
    coutLivraison: legacyProduct.coutLivraison || legacyProduct.shippingCost,

    // Vinted specific
    vintedItemId: legacyProduct.vintedItemId || legacyProduct.externalId,

    // Sale information
    vendu: legacyProduct.vendu || "0",
    dateMiseEnLigne: legacyProduct.dateMiseEnLigne || legacyProduct.listedAt,
    dateVente: legacyProduct.dateVente || legacyProduct.soldAt,
    prixVente: legacyProduct.prixVente || legacyProduct.sellingPrice,
    plateforme: legacyProduct.plateforme || legacyProduct.platform,

    // Modern status system
    status:
      legacyProduct.status || mapLegacyStatusToModern(legacyProduct.vendu),

    // URLs
    url: legacyProduct.url,
    photoUrl: legacyProduct.photoUrl || legacyProduct.imageUrl,

    // Timestamps
    createdAt: legacyProduct.createdAt || new Date().toISOString(),
    updatedAt: legacyProduct.updatedAt,
    soldAt: legacyProduct.soldAt || legacyProduct.dateVente,
  };
}

/**
 * Maps legacy vendu status to modern ProductStatus
 */
function mapLegacyStatusToModern(vendu: string | undefined): ProductStatus {
  switch (vendu) {
    case "1":
      return ProductStatus.SOLD;
    case "2":
      return ProductStatus.RESERVED;
    case "3":
      return ProductStatus.REMOVED;
    case "0":
    default:
      return ProductStatus.AVAILABLE;
  }
}

/**
 * Validates product transformation result
 */
export function validateProductTransformation<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  operation: string,
): T {
  return validateTransformedData(data, schema, `product ${operation}`);
}

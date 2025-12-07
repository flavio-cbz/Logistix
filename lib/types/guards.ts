/**
 * Type guard functions for runtime type checking
 * These functions verify that unknown objects match expected entity shapes at runtime
 */

import type { Product, ProductStatus } from "./entities";

/**
 * Type guard for Product entity
 * Checks if an unknown value is a valid Product object
 */
export function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Required fields
  if (typeof obj['id'] !== "string") return false;
  if (typeof obj['userId'] !== "string") return false;

  // Optional fields validation
  if (obj['parcelleId'] !== undefined && obj['parcelleId'] !== null && typeof obj['parcelleId'] !== "string") {
    return false;
  }
  if (obj['name'] !== undefined && obj['name'] !== null && typeof obj['name'] !== "string") {
    return false;
  }
  if (obj['nom'] !== undefined && obj['nom'] !== null && typeof obj['nom'] !== "string") {
    return false;
  }
  if (obj['details'] !== undefined && obj['details'] !== null && typeof obj['details'] !== "string") {
    return false;
  }
  if (obj['price'] !== undefined && obj['price'] !== null && typeof obj['price'] !== "number") {
    return false;
  }

  return true;
}

/**
 * Type guard for Parcelle entity
 * Checks if an unknown value is a valid Parcelle object
 */
export function isParcelle(value: unknown): value is { id: string; name: string; userId: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['id'] === "string" &&
    typeof obj['name'] === "string" &&
    typeof obj['userId'] === "string"
  );
}

/**
 * Type guard for User entity
 * Checks if an unknown value is a valid User object
 */
export function isUser(value: unknown): value is { id: string; username: string; email?: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj['id'] !== "string") return false;
  if (typeof obj['username'] !== "string") return false;
  if (obj['email'] !== undefined && obj['email'] !== null && typeof obj['email'] !== "string") {
    return false;
  }

  return true;
}

/**
 * Type guard for ProductStatus enum
 */
export function isProductStatus(value: unknown): value is ProductStatus {
  return (
    typeof value === "string" &&
    (value === "draft" || value === "published" || value === "sold")
  );
}

/**
 * Type guard for array of Products
 */
export function isProductArray(value: unknown): value is Product[] {
  return Array.isArray(value) && value.every(isProduct);
}

/**
 * Type guard for array of Parcelles
 */
export function isParcelleArray(value: unknown): value is Array<{ id: string; name: string; userId: string }> {
  return Array.isArray(value) && value.every(isParcelle);
}

/**
 * Type guard for array of Users
 */
export function isUserArray(value: unknown): value is Array<{ id: string; username: string; email?: string }> {
  return Array.isArray(value) && value.every(isUser);
}

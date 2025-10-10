/**
 * Common transformation utilities shared across different entity transformers
 */

import { z } from "zod";

/**
 * Transforms string numbers to actual numbers for API consumption
 */
export function transformStringToNumber(value: string | number): number {
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) throw new Error(`Invalid number: ${value}`);
  return parsed;
}

/**
 * Transforms number to string for form display
 */
export function transformNumberToString(value: number | undefined): string {
  return value !== undefined ? value.toString() : "";
}

/**
 * Sanitizes and trims string values
 */
export function sanitizeString(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined;
}

/**
 * Transforms date string to ISO format for API
 */
export function transformDateForApi(
  dateString: string | null | undefined,
): string | undefined {
  if (!dateString) return undefined;

  try {
    const date = new Date(dateString);
    return date.toISOString();
  } catch (error) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
}

/**
 * Transforms ISO date to display format
 */
export function transformDateForDisplay(isoString: string | undefined): string {
  if (!isoString) return "";

  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("fr-FR");
  } catch (error) {
    return "";
  }
}

/**
 * Validates transformed data against a schema
 */
export function validateTransformedData<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  context: string,
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new Error(`Validation failed for ${context}: ${errorMessages}`);
    }
    throw new Error(`Validation failed for ${context}: ${error}`);
  }
}

/**
 * Removes undefined values from an object
 */
export function removeUndefinedValues<T extends Record<string, any>>(
  obj: T,
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }

  return result;
}

/**
 * Deep clones an object to avoid mutation
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

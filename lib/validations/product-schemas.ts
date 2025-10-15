/**
 * @fileoverview Zod validation schemas for product creation and update operations
 * @description This module provides validation schemas for product-related API operations
 * including creation and update of products with proper validation rules and error messages.
 * Ensures data integrity for all product operations in the system.
 * @version 1.0.0
 * @since 2025-01-09
 * @author Development Team
 */

import { z } from 'zod';

/**
 * Zod schema for validating product creation requests
 * 
 * @description Validates all required and optional fields for creating a new product.
 * Ensures proper data types, required fields, and business rule validation.
 * @example
 * ```typescript
 * const productData = CreateProductSchema.parse({
 *   name: "Vintage Dress",
 *   brand: "Zara",
 *   category: "Clothing",
 *   price: 25.99,
 *   poids: 250,
 *   parcelleId: "parcelle-123"
 * });
 * ```
 */
export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
  brand: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0, 'Le prix doit être positif'),
  poids: z.number().min(0, 'Le poids doit être positif').optional(),
  parcelleId: z.string().optional(),
});

/**
 * Zod schema for validating product update requests
 * 
 * @description Validates partial updates to existing products. All fields are optional
 * except for validation rules that must be respected when fields are provided.
 * @example
 * ```typescript
 * const updateData = UpdateProductSchema.parse({
 *   name: "Updated Product Name",
 *   price: 29.99
 * });
 * ```
 */
export const UpdateProductSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long').optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0, 'Le prix doit être positif').optional(),
});

/**
 * TypeScript type for product creation input
 * 
 * @description Inferred type from CreateProductSchema for use in TypeScript code.
 * Represents the structure of data required to create a new product.
 */
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

/**
 * TypeScript type for product update input
 * 
 * @description Inferred type from UpdateProductSchema for use in TypeScript code.
 * Represents the structure of data for updating an existing product.
 */
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
/**
 * @fileoverview Zod validation schemas for Vinted market analysis API responses and requests
 * @description This module provides comprehensive validation schemas for all Vinted API interactions
 * including sold items, catalogs, brand suggestions, and market analysis requests.
 * All schemas ensure type safety and data validation for the market analysis feature.
 * @version 1.0.0
 * @since 2025-01-09
 * @author Development Team
 */

import { z } from "zod";

/**
 * Type definition for recursive catalog structure
 * 
 * @description Defines the structure for Vinted catalog objects that can contain
 * nested subcatalogs. Used to avoid TypeScript 'any' type in recursive schema.
 */
type CatalogType = {
  id?: number;
  title?: string;
  catalogs?: CatalogType[];
};

/**
 * Zod schema for Vinted catalog validation with recursive structure
 * 
 * @description Validates Vinted catalog objects that can contain nested subcatalogs.
 * Uses lazy evaluation to handle recursive references properly.
 * @example
 * ```typescript
 * const catalog = CatalogSchema.parse({
 *   id: 1,
 *   title: "Women's Clothing",
 *   catalogs: [{ id: 2, title: "Dresses" }]
 * });
 * ```
 */
export const CatalogSchema: z.ZodType<CatalogType> = z.object({
  id: z.number(),
  title: z.string(),
  catalogs: z.array(z.lazy(() => CatalogSchema)),
});

/**
 * Zod schema for validating sold item data from Vinted API
 * 
 * @description Validates the structure of sold items returned by Vinted's API.
 * Includes product details, pricing, brand information, and sale timestamps.
 * @example
 * ```typescript
 * const soldItem = SoldItemSchema.parse({
 *   title: "Vintage Dress",
 *   price: { amount: "25.00", currency: "EUR" },
 *   brand: { id: 123, title: "Zara" }
 * });
 * ```
 */
export const SoldItemSchema = z.object({
  title: z.string(),
  price: z.object({
    amount: z.string(),
    currency: z.string().optional(),
  }),
  size_title: z.string().optional(),
  brand: z
    .object({
      id: z.number(),
      title: z.string(),
    })
    .optional(),
  created_at: z.string().optional(),
  sold_at: z.string().optional(),
});

/**
 * Zod schema for brand suggestion objects from Vinted API
 * 
 * @description Validates brand suggestion data used in search autocomplete
 * and brand filtering functionality.
 * @example
 * ```typescript
 * const brand = SuggestionBrandSchema.parse({
 *   id: 456,
 *   title: "Nike"
 * });
 * ```
 */
export const SuggestionBrandSchema = z.object({
  id: z.number(),
  title: z.string(),
});

/**
 * Zod schema for brand suggestions API response
 * 
 * @description Validates the response structure when fetching brand suggestions
 * from Vinted's autocomplete API.
 * @example
 * ```typescript
 * const response = SuggestionsResponseSchema.parse({
 *   brands: [{ id: 1, title: "Adidas" }, { id: 2, title: "Nike" }]
 * });
 * ```
 */
export const SuggestionsResponseSchema = z.object({
  brands: z.array(SuggestionBrandSchema),
});

/**
 * Zod schema for sold items API response wrapper
 * 
 * @description Validates the response structure when fetching sold items
 * from Vinted's search API. Contains an array of sold items.
 * @example
 * ```typescript
 * const response = ApiResponseSoldItemsSchema.parse({
 *   items: [soldItem1, soldItem2, soldItem3]
 * });
 * ```
 */
export const ApiResponseSoldItemsSchema = z.object({
  items: z.array(SoldItemSchema),
});

/**
 * Zod schema for Vinted initializers API response
 * 
 * @description Validates the response from Vinted's initializers endpoint
 * which provides catalog data for category selection.
 * @example
 * ```typescript
 * const response = InitializersResponseSchema.parse({
 *   dtos: { catalogs: [catalog1, catalog2] }
 * });
 * ```
 */
export const InitializersResponseSchema = z.object({
  dtos: z.object({
    catalogs: z.array(CatalogSchema),
  }),
});

/**
 * Zod schema for market analysis request validation
 * 
 * @description Validates requests to start a market analysis. Ensures all required
 * parameters are present and properly formatted before processing.
 * @example
 * ```typescript
 * const request = MarketAnalysisRequestSchema.parse({
 *   userId: "user123",
 *   productName: "Vintage Dress",
 *   catalogId: 5,
 *   brandId: 123,
 *   maxProducts: 50
 * });
 * ```
 */
export const MarketAnalysisRequestSchema = z.object({
  userId: z.string(),
  productName: z.string().min(1),
  catalogId: z.number().int(),
  categoryName: z.string().optional(),
  brandId: z.number().optional(),
  maxProducts: z.number().int().optional(),
  advancedParams: z.record(z.unknown()).optional(),
  itemStates: z.array(z.number()).optional(),
});

/**
 * TypeScript type for sold item objects
 * 
 * @description Inferred type from SoldItemSchema for use in TypeScript code.
 * Represents a sold item with all its properties and optional fields.
 */
export type SoldItem = z.infer<typeof SoldItemSchema>;

/**
 * TypeScript type for catalog objects
 * 
 * @description Inferred type from CatalogSchema for use in TypeScript code.
 * Represents a catalog with potential nested subcatalogs.
 */
export type Catalog = z.infer<typeof CatalogSchema>;

/**
 * TypeScript type for brand suggestion objects
 * 
 * @description Inferred type from SuggestionBrandSchema for use in TypeScript code.
 * Represents a brand suggestion with ID and title.
 */
export type SuggestionBrand = z.infer<typeof SuggestionBrandSchema>;

/**
 * TypeScript type for market analysis request objects
 * 
 * @description Inferred type from MarketAnalysisRequestSchema for use in TypeScript code.
 * Represents a complete market analysis request with all parameters.
 */
export type MarketAnalysisRequest = z.infer<typeof MarketAnalysisRequestSchema>;

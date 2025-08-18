import { z } from 'zod';

/**
 * Schéma récursif Catalog — utiliser le schéma Zod et inférer le type pour éviter les divergences.
 */
export const CatalogSchema = z.object({
    id: z.number(),
    title: z.string(),
    catalogs: z.array(z.lazy(() => CatalogSchema)).default([]),
});

export const SoldItemSchema = z.object({
    title: z.string(),
    price: z.object({
        amount: z.string(),
        currency: z.string().optional(),
    }),
    size_title: z.string().optional(),
    brand: z.object({
        id: z.number(),
        title: z.string(),
    }).optional(),
    created_at: z.string().optional(),
    sold_at: z.string().optional(),
});

export const SuggestionBrandSchema = z.object({
    id: z.number(),
    title: z.string(),
});

export const SuggestionsResponseSchema = z.object({
    brands: z.array(SuggestionBrandSchema),
});

export const ApiResponseSoldItemsSchema = z.object({ 
    items: z.array(SoldItemSchema) 
});

export const InitializersResponseSchema = z.object({
    dtos: z.object({
        catalogs: z.array(CatalogSchema),
    }),
});

export type SoldItem = z.infer<typeof SoldItemSchema>;
export type Catalog = z.infer<typeof CatalogSchema>;
export type SuggestionBrand = z.infer<typeof SuggestionBrandSchema>;
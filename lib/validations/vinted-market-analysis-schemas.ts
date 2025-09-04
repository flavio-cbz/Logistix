import { z } from 'zod';

/**
 * Schéma récursif Catalog avec annotation de type explicite pour éviter le type 'any'.
 */
type CatalogType = {
    id?: number;
    title?: string;
    catalogs?: CatalogType[];
};
export const CatalogSchema: z.ZodType<CatalogType> = z.object({
    id: z.number(),
    title: z.string(),
    catalogs: z.array(z.lazy(() => CatalogSchema)),
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

 // Schéma de requête pour démarrer une analyse de marché (aligné sur AnalysisRequest)
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

export type SoldItem = z.infer<typeof SoldItemSchema>;
export type Catalog = z.infer<typeof CatalogSchema>;
export type SuggestionBrand = z.infer<typeof SuggestionBrandSchema>;
export type MarketAnalysisRequest = z.infer<typeof MarketAnalysisRequestSchema>;
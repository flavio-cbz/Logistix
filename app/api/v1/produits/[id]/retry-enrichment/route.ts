<<<<<<< HEAD
import { NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { ProductEnrichmentService } from "@/lib/services/product-enrichment-service";
import {
    createErrorResponse,
    createSuccessResponse,
    createNotFoundResponse
} from "@/lib/utils/api-response";
import { type Product } from "@/lib/database/schema";

type ProductUpdateData = Partial<Product>;
// Extract specific EnrichmentData type from Product if possible, or define compatible shape
type EnrichmentData = NonNullable<Product['enrichmentData']>;

/**
 * POST /api/v1/produits/[id]/retry-enrichment
 * Retry AI enrichment for a product that failed enrichment
 */
export async function POST(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const productService = serviceContainer.getProductService();
        const product = await productService.getProduct(id, user.id);

        if (!product) {
            return createNotFoundResponse("Produit");
        }

        // Get Gemini credentials using IntegrationService
        const integrationService = serviceContainer.getIntegrationService();
        const credentials = await integrationService.getCredentials(user.id, "gemini");

        if (!credentials || !credentials["enabled"]) {
            return NextResponse.json(
                { error: "L'enrichissement Gemini n'est pas activé" },
                { status: 400 }
            );
        }

        const apiKey = String(credentials["apiKey"] || "");
        const model = String(credentials["model"] || "gemini-2.5-flash");

        // Get photo URLs for enrichment
        const photoUrls = (product.photoUrls as string[]) ||
            (product.photoUrl ? [product.photoUrl] : []);

        if (photoUrls.length === 0) {
            return NextResponse.json(
                { error: "Aucune photo disponible pour l'enrichissement" },
                { status: 400 }
            );
        }

        // Mark as pending first
        await productService.updateProduct(id, user.id, {
            enrichmentData: {
                ...(product.enrichmentData || {}),
                enrichmentStatus: 'pending',
                enrichedAt: new Date().toISOString(),
            } as EnrichmentData,
        } as ProductUpdateData);

        // Run enrichment
        const enrichmentService = new ProductEnrichmentService(apiKey, model);
        const result = await enrichmentService.enrichProduct(product.name, photoUrls);

        // Use default confidence threshold (0.9)
        const confidenceThreshold = 0.9;
        const isLowConfidence = result.confidence < confidenceThreshold;
        const newName = isLowConfidence ? `"${result.name}"` : result.name;

        // Update product with enrichment results
        await productService.updateProduct(id, user.id, {
            name: newName,
            brand: result.brand || product.brand,
            category: result.category || product.category,
            subcategory: result.subcategory || product.subcategory,
            url: result.url || product.url,
            description: result.description || product.description,
            enrichmentData: {
                confidence: result.confidence,
                originalUrl: result.url,
                source: result.source,
                modelUsed: model,
                enrichedAt: new Date().toISOString(),
                enrichmentStatus: 'done',
                vintedBrandId: result.vintedBrandId,
                vintedCatalogId: result.vintedCatalogId,
            } as EnrichmentData,
        } as ProductUpdateData);

        return createSuccessResponse({
            message: "Produit enrichi avec succès",
            result: {
                name: newName,
                confidence: result.confidence,
                brand: result.brand,
                category: result.category,
            },
        });
    } catch (error) {
        // Try to mark as failed
        try {
            const { id } = await params;
            const authService = serviceContainer.getAuthService();
            const user = await authService.requireAuth();
            const productService = serviceContainer.getProductService();

            await productService.updateProduct(id, user.id, {
                enrichmentData: {
                    enrichmentStatus: 'failed',
                    enrichedAt: new Date().toISOString(),
                    error: error instanceof Error ? error.message : 'Erreur inconnue',
                } as EnrichmentData,
            } as ProductUpdateData);
        } catch (_e) {
            // Ignore update errors
        }

        return createErrorResponse(error);
    }
}

=======
import { NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { databaseService } from "@/lib/database/database-service";
import { ProductEnrichmentService } from "@/lib/services/product-enrichment-service";
import { decryptSecret } from "@/lib/utils/crypto";
import {
    createErrorResponse,
    createSuccessResponse,
    createNotFoundResponse
} from "@/lib/utils/api-response";
import { type Product } from "@/lib/database/schema";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/database/schema";

interface GeminiCredentials {
    apiKey: string;
    model?: string;
    enabled?: boolean;
    confidenceThreshold?: number;
}

type ProductUpdateData = Partial<Product>;
// Extract specific EnrichmentData type from Product if possible, or define compatible shape
type EnrichmentData = NonNullable<Product['enrichmentData']>;

/**
 * POST /api/v1/produits/[id]/retry-enrichment
 * Retry AI enrichment for a product that failed enrichment
 */
export async function POST(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const productService = serviceContainer.getProductService();
        const product = await productService.getProduct(id, user.id);

        if (!product) {
            return createNotFoundResponse("Produit");
        }

        // Get Gemini credentials using the same pattern as automation.ts
        const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;
        const cred = await db.query.integrationCredentials.findFirst({
            where: (t, { eq, and }) => and(
                eq(t.userId, user.id),
                eq(t.provider, "gemini")
            )
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const credentials = (cred as any)?.credentials as GeminiCredentials | undefined;

        if (!credentials || !credentials.enabled) {
            return NextResponse.json(
                { error: "L'enrichissement Gemini n'est pas activé" },
                { status: 400 }
            );
        }

        const apiKey = await decryptSecret(credentials.apiKey, user.id);
        const model = credentials.model || "gemini-2.5-flash";

        // Get photo URLs for enrichment
        const photoUrls = (product.photoUrls as string[]) ||
            (product.photoUrl ? [product.photoUrl] : []);

        if (photoUrls.length === 0) {
            return NextResponse.json(
                { error: "Aucune photo disponible pour l'enrichissement" },
                { status: 400 }
            );
        }

        // Mark as pending first
        await productService.updateProduct(id, user.id, {
            enrichmentData: {
                ...(product.enrichmentData || {}),
                enrichmentStatus: 'pending',
                enrichedAt: new Date().toISOString(),
            } as EnrichmentData,
        } as ProductUpdateData);

        // Run enrichment
        const enrichmentService = new ProductEnrichmentService(apiKey, model);
        const result = await enrichmentService.enrichProduct(product.name, photoUrls);

        // Get confidence threshold from config
        const confidenceThreshold = credentials.confidenceThreshold ?? 0.9;
        const isLowConfidence = result.confidence < confidenceThreshold;
        const newName = isLowConfidence ? `"${result.name}"` : result.name;

        // Update product with enrichment results
        await productService.updateProduct(id, user.id, {
            name: newName,
            brand: result.brand || product.brand,
            category: result.category || product.category,
            subcategory: result.subcategory || product.subcategory,
            url: result.url || product.url,
            description: result.description || product.description,
            enrichmentData: {
                confidence: result.confidence,
                originalUrl: result.url,
                source: result.source,
                modelUsed: model,
                enrichedAt: new Date().toISOString(),
                enrichmentStatus: 'done',
                vintedBrandId: result.vintedBrandId,
                vintedCatalogId: result.vintedCatalogId,
            } as EnrichmentData,
        } as ProductUpdateData);

        return createSuccessResponse({
            message: "Produit enrichi avec succès",
            result: {
                name: newName,
                confidence: result.confidence,
                brand: result.brand,
                category: result.category,
            },
        });
    } catch (error) {
        // Try to mark as failed
        try {
            const { id } = await params;
            const authService = serviceContainer.getAuthService();
            const user = await authService.requireAuth();
            const productService = serviceContainer.getProductService();

            await productService.updateProduct(id, user.id, {
                enrichmentData: {
                    enrichmentStatus: 'failed',
                    enrichedAt: new Date().toISOString(),
                    error: error instanceof Error ? error.message : 'Erreur inconnue',
                } as EnrichmentData,
            } as ProductUpdateData);
        } catch (_e) {
            // Ignore update errors
        }

        return createErrorResponse(error);
    }
}

>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

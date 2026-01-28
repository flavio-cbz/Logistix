import { databaseService } from '@/lib/database/database-service';
import { products, parcels, type NewParcel, type NewProduct } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { decryptSecret } from '@/lib/utils/crypto';
import { ProductEnrichmentService, SuperbuyMetadata } from '@/lib/services/product-enrichment-service';
import { ImageProcessor } from '@/lib/services/image-processor';
import { parallelWithRateLimit } from '@/lib/utils/rate-limiter';
import { logger } from '@/lib/utils/logging/logger';
import { ParsedSuperbuyProduct } from "@/lib/shared/types/superbuy";
import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/database/schema";
import { ParcelRepository } from '@/lib/repositories/parcel-repository';
import { SUPERBUY_STATUS_PATTERNS } from './constants';
import { z } from "zod";

const GeminiCredentialsSchema = z.object({
  apiKey: z.string(),
  model: z.string().optional(),
  confidenceThreshold: z.number().optional(),
  enabled: z.boolean().optional(),
});

interface SuperbuyParcel {
  superbuyId: string;
  trackingNumber?: string | null;
  carrier?: string;
  status?: string;
  weight?: number;
  priceEUR?: number;
}

interface EnrichmentTask {
  productId: string;
  name: string;
  photoUrls: string[];
  superbuyMetadata?: SuperbuyMetadata;
}

export class SuperbuyDataProcessor {
  constructor(private parcelsRepo: ParcelRepository) {}

  async processParcels(userId: string, parcelsData: SuperbuyParcel[], onProgress?: (p: number, m: string) => Promise<void>) {
    if (parcelsData.length === 0) return 0;

    if (onProgress) await onProgress(30, `Found ${parcelsData.length} parcels. Saving...`);

    // 1. Save to Parcels Repository (Unified)
    await this.parcelsRepo.upsertMany(parcelsData as NewParcel[]);

    // 2. Sync to Legacy Parcels Table
    await this.syncParcelsToLegacy(userId, parcelsData, onProgress);

    return parcelsData.length;
  }

  async processProducts(
    userId: string,
    productsList: ParsedSuperbuyProduct[],
    onProgress?: (p: number, m: string) => Promise<void>,
    enrichProducts: boolean = true
  ) {
    if (productsList.length === 0) return 0;

    if (onProgress) await onProgress(40, `Found ${productsList.length} products. Syncing...`);

    await this.syncProductsFromParcels(userId, productsList, onProgress, enrichProducts);

    return productsList.length;
  }

  private async syncParcelsToLegacy(userId: string, newParcels: SuperbuyParcel[], onProgress?: (p: number, m: string) => Promise<void>) {
    const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;
    const totalParcels = newParcels.length;

    for (let i = 0; i < totalParcels; i++) {
      const parcel = newParcels[i];
      if (!parcel) continue;

      if (onProgress) {
        const percent = 30 + Math.floor((i / totalParcels) * 10);
        try {
          await onProgress(percent, `Synchronisation parcelle ${i + 1}/${totalParcels}: ${parcel.trackingNumber || parcel.superbuyId}`);
        } catch (progressError) {
          if (progressError instanceof Error && progressError.message === 'JOB_CANCELLED') {
            throw progressError;
          }
        }
      }

      const existingParcel = await db.query.parcels.findFirst({
        where: and(
          eq(parcels.userId, userId),
          eq(parcels.superbuyId, parcel.superbuyId)
        )
      });

      const totalPrice = parcel.priceEUR || 0;
      const weight = parcel.weight || 0;
      const pricePerGram = weight > 0 && totalPrice > 0 ? totalPrice / weight : 0;
      const status = this.mapStatus(parcel.status || '');

      const parcelData = {
        userId,
        superbuyId: parcel.superbuyId,
        trackingNumber: parcel.trackingNumber || null,
        carrier: parcel.carrier || 'Unknown',
        name: parcel.trackingNumber || `Colis ${parcel.superbuyId}`,
        weight,
        status,
        totalPrice,
        pricePerGram,
        isActive: 1,
        updatedAt: new Date().toISOString()
      };

      if (existingParcel) {
        await db.update(parcels)
          .set(parcelData)
          .where(eq(parcels.id, existingParcel.id));
      } else {
        await db.insert(parcels).values({
          ...parcelData,
          createdAt: new Date().toISOString()
        } as NewParcel);
      }
    }
  }

  private async syncProductsFromParcels(userId: string, productsList: ParsedSuperbuyProduct[], onProgress?: (p: number, m: string) => Promise<void>, enrichProducts: boolean = true) {
    const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;

    // 1. Initialize Enrichment Service
    let enrichmentService: ProductEnrichmentService | null = null;
    let confidenceThreshold = 0.9;

    if (enrichProducts) {
      try {
        const cred = await db.query.integrationCredentials.findFirst({
          where: (t, { eq, and }) => and(
            eq(t.userId, userId),
            eq(t.provider, "gemini")
          )
        });

        if (cred && cred.credentials) {
          const validation = GeminiCredentialsSchema.safeParse(cred.credentials);

          if (validation.success && validation.data.enabled && validation.data.apiKey) {
            const credentials = validation.data;
            const apiKey = await decryptSecret(credentials.apiKey, userId);
            const model = credentials.model || "gemini-2.0-flash";
            confidenceThreshold = credentials.confidenceThreshold ?? 0.9;
            enrichmentService = new ProductEnrichmentService(apiKey, model);
          }
        }
      } catch (e: unknown) {
        logger.error("Failed to initialize enrichment service", { error: e });
      }
    }

    interface EnrichmentTask {
      productId: string;
      name: string;
      photoUrls: string[];
      superbuyMetadata?: SuperbuyMetadata;
    }
    const enrichmentTasks: EnrichmentTask[] = [];
    const totalProducts = productsList.length;

    // 2. Save Initial Products
    for (let i = 0; i < totalProducts; i++) {
      const product = productsList[i];
      if (!product) continue;

      try {
        if (onProgress) {
          const percent = 40 + Math.floor((i / totalProducts) * 50);
          await onProgress(percent, `Traitement produit ${i + 1}/${totalProducts}: ${product.name.substring(0, 30)}...`);
        }

        const parcel = await db.query.parcels.findFirst({
          where: and(
            eq(parcels.userId, userId),
            eq(parcels.superbuyId, product.parcelleId)
          )
        });

        if (!parcel) {
          logger.warn(`[Superbuy][Products] Parcel not found for packageNo: ${product.parcelleId}`);
          continue;
        }

        const externalId = product.externalId;
        if (!externalId) continue;

        const existingProduct = await db.query.products.findFirst({
          where: and(
            eq(products.userId, userId),
            eq(products.externalId, externalId)
          )
        });

        let name = product.name;
        let url = product.url;
        let enrichmentData = null;
        let enrichedDescription = '';
        let enrichedBrand = product.brand;
        let enrichedCategory = product.category;
        let enrichedSubcategory = product.subcategory;

        if (enrichmentService) {
          const existingStatus = existingProduct?.enrichmentData?.enrichmentStatus;
          const needsEnrichment = !existingProduct
            || !existingProduct.enrichmentData
            || existingStatus === 'failed'
            || existingStatus === 'pending';

          if (needsEnrichment) {
            enrichmentData = {
              enrichmentStatus: 'pending',
              enrichedAt: new Date().toISOString(),
            };
          } else if (existingProduct && existingProduct.enrichmentData) {
            enrichmentData = existingProduct.enrichmentData;
            name = existingProduct.name;
            url = existingProduct.url || url;
            enrichedDescription = existingProduct.description || '';
            enrichedBrand = existingProduct.brand || enrichedBrand;
            enrichedCategory = existingProduct.category || enrichedCategory;
            enrichedSubcategory = existingProduct.subcategory || enrichedSubcategory;
          }
        }

        // Process images
        let processedPhotoUrls: string[] = [];
        let processedPhotoUrl: string | undefined = undefined;

        try {
          const imageProcessor = ImageProcessor.getInstance();
          // Ensure product is defined and has valid properties
          const rawUrls: string[] = (product.photoUrls && product.photoUrls.length > 0)
            ? product.photoUrls
            : (product.photoUrl ? [product.photoUrl] : []);

          if (rawUrls.length > 0) {
            const processPromises = rawUrls.map((url, index) =>
              imageProcessor.downloadAndOrientImage(url, userId, externalId, index)
            );

            const results = await Promise.all(processPromises);
            processedPhotoUrls = results.filter((url): url is string => !!url);

            if (processedPhotoUrls.length > 0) {
              processedPhotoUrl = processedPhotoUrls[0];
            }
          }
        } catch (e: unknown) {
          logger.error(`[Superbuy] Failed to process images for product ${externalId}`, { error: e });
          processedPhotoUrls = product.photoUrls ?? [];
          processedPhotoUrl = product.photoUrl;
        }

        const productData = {
          userId,
          name: name,
          description: enrichedDescription || product.subcategory || '',
          brand: enrichedBrand || null,
          category: enrichedCategory || null,
          subcategory: enrichedSubcategory || null,
          photoUrl: processedPhotoUrl || product.photoUrl || null,
          photoUrls: processedPhotoUrls.length > 0 ? processedPhotoUrls : (product.photoUrls || null),
          price: product.price ?? 0,
          poids: product.poids ?? 0,
          parcelId: parcel.id,
          status: product.status || 'pending',
          externalId,
          url: url || null,
          currency: product.currency || null,
          plateforme: product.plateforme || null,
          enrichmentData: enrichmentData || null,
          updatedAt: new Date().toISOString()
        };

        let savedProductId: string | null = null;

        if (existingProduct) {
          await db.update(products)
            .set(productData as Partial<NewProduct>)
            .where(eq(products.id, existingProduct.id));
          savedProductId = existingProduct.id;
        } else {
          const result = await db.insert(products).values({
            ...productData,
            createdAt: new Date().toISOString()
          } as NewProduct).returning({ id: products.id });
          savedProductId = result[0]?.id || null;
        }

        if (enrichmentService && enrichmentData?.enrichmentStatus === 'pending' && savedProductId) {
          const fallbackUrls = product.photoUrl ? [product.photoUrl] : [];
          enrichmentTasks.push({
            productId: savedProductId,
            name: product.name,
            photoUrls: processedPhotoUrls.length > 0 ? processedPhotoUrls : (product.photoUrls ?? fallbackUrls),
            superbuyMetadata: product.superbuyMetadata || undefined,
          });
        }
      } catch (e) {
        logger.error('[Superbuy][Products] Error syncing product:', { error: e, product: product.externalId });
      }
    }

    // 3. Execute Enrichment
    if (enrichmentService && enrichmentTasks.length > 0) {
      await this.runEnrichment(enrichmentService, enrichmentTasks, confidenceThreshold, onProgress);
    }
  }

  private async runEnrichment(
    enrichmentService: ProductEnrichmentService,
    enrichmentTasks: EnrichmentTask[],
    confidenceThreshold: number,
    onProgress?: (p: number, m: string) => Promise<void>
  ) {
    const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;

    logger.info(`[Superbuy][Enrichment] Starting parallel enrichment for ${enrichmentTasks.length} products`);
    if (onProgress) await onProgress(60, `Enriching ${enrichmentTasks.length} products...`);

    let completedCount = 0;
    let isCancelled = false;
    const totalEnrichmentTasks = enrichmentTasks.length;

    const tasks = enrichmentTasks.map((task) => async () => {
      if (isCancelled) return { success: false, productId: task.productId, skipped: true };

      try {
        const exists = await db.query.products.findFirst({
          where: eq(products.id, task.productId),
          columns: { id: true }
        });

        if (!exists) {
          return { success: false, productId: task.productId, skipped: true };
        }

        const res = await enrichmentService.enrichProduct(task.name, task.photoUrls, task.superbuyMetadata);
        const isLowConfidence = res.confidence < confidenceThreshold;

        if (isLowConfidence) {
           const candidate = {
            id: crypto.randomUUID(),
            name: res.name,
            brand: res.brand,
            category: res.category,
            url: res.url,
            confidence: res.confidence,
            imageUrl: task.photoUrls[0] || undefined,
            description: res.description,
          };

          await db.update(products)
            .set({
              enrichmentData: {
                confidence: res.confidence,
                originalUrl: res.url,
                source: res.source,
                modelUsed: enrichmentService.currentModelName || 'unknown',
                enrichedAt: new Date().toISOString(),
                enrichmentStatus: 'conflict',
                vintedBrandId: res.vintedBrandId,
                vintedCatalogId: res.vintedCatalogId,
                productCode: res.productCode,
                retailPrice: res.retailPrice,
                color: res.color,
                size: res.size,
                generatedDescription: res.description,
                candidates: [candidate],
              },
              updatedAt: new Date().toISOString()
            })
            .where(eq(products.id, task.productId));

          return { success: true, productId: task.productId, conflict: true };
        }

        await db.update(products)
          .set({
            name: res.name,
            brand: res.brand || undefined,
            category: res.category || undefined,
            subcategory: res.subcategory || undefined,
            url: res.url && res.url.startsWith('http') ? res.url : undefined,
            description: res.description || undefined,
            enrichmentData: {
              confidence: res.confidence,
              originalUrl: res.url,
              source: res.source,
              modelUsed: enrichmentService.currentModelName || 'unknown',
              enrichedAt: new Date().toISOString(),
              enrichmentStatus: 'done',
              vintedBrandId: res.vintedBrandId,
              vintedCatalogId: res.vintedCatalogId,
              productCode: res.productCode,
              retailPrice: res.retailPrice,
              color: res.color,
              size: res.size,
              generatedDescription: res.description
            },
            updatedAt: new Date().toISOString()
          })
          .where(eq(products.id, task.productId));

        return { success: true, productId: task.productId };
      } catch (error) {
        if (error instanceof Error && error.message === 'JOB_CANCELLED') {
          isCancelled = true;
          throw error;
        }

        await db.update(products)
          .set({
            enrichmentData: {
              enrichmentStatus: 'failed',
              enrichedAt: new Date().toISOString(),
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            updatedAt: new Date().toISOString()
          })
          .where(eq(products.id, task.productId));

        return { success: false, productId: task.productId, error };
      } finally {
        completedCount++;
        if (onProgress && !isCancelled) {
          const percentage = 60 + Math.floor((completedCount / totalEnrichmentTasks) * 30);
          try {
            await onProgress(percentage, `Enriching product ${completedCount}/${totalEnrichmentTasks}...`);
          } catch (progressError) {
            if (progressError instanceof Error && progressError.message === 'JOB_CANCELLED') {
              isCancelled = true;
              throw progressError;
            }
          }
        }
      }
    });

    const abortSignal = { aborted: isCancelled };
    const { aborted, errors } = await parallelWithRateLimit(tasks, {
      maxConcurrent: 3,
      delayBetweenMs: 500,
      continueOnError: true,
      abortSignal,
    });

    if (aborted || abortSignal.aborted) {
      throw new Error('JOB_CANCELLED');
    }

    const failedCount = errors.filter(e => e !== null).length;
    logger.info(`[Superbuy][Enrichment] Completed: ${enrichmentTasks.length - failedCount} succeeded, ${failedCount} failed`);
  }

  private mapStatus(status: string): string {
    const s = status.toLowerCase().trim();

    if ((SUPERBUY_STATUS_PATTERNS.PENDING as readonly string[]).includes(s)) return 'Pending';
    if ((SUPERBUY_STATUS_PATTERNS.IN_TRANSIT as readonly string[]).includes(s)) return 'In Transit';
    if ((SUPERBUY_STATUS_PATTERNS.DELIVERED as readonly string[]).includes(s)) return 'Delivered';
    if ((SUPERBUY_STATUS_PATTERNS.RETURNED as readonly string[]).includes(s)) return 'Returned';
    if ((SUPERBUY_STATUS_PATTERNS.CANCELLED as readonly string[]).includes(s)) return 'Cancelled';
    if ((SUPERBUY_STATUS_PATTERNS.LOST as readonly string[]).includes(s)) return 'Lost';

    if (s.includes('ship') || s.includes('transit')) return 'In Transit';
    if (s.includes('deliver') || s.includes('sign') || s.includes('received')) return 'Delivered';
    if (s.includes('return')) return 'Returned';
    if (s.includes('cancel')) return 'Cancelled';
    if (s.includes('lost')) return 'Lost';

    return 'Pending';
  }
}

/**
 * Superbuy Extraction Service
 * Handles Puppeteer-based data extraction from Superbuy
 */

import { BaseService } from "../base-service";

export interface ExtractedParcel {
  parcelId: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  weight: number;
  shippingFee: number;
  goodsName: string;
  warehouseName: string;
  packageId?: string | number;
}

export interface ExtractionStep {
  type: 'extraction' | 'normalization' | 'sync' | 'complete';
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  progress?: number;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface ExtractionResult {
  success: boolean;
  parcels: ExtractedParcel[];
  steps: ExtractionStep[];
  error?: string;
  needsAuth?: boolean;
}

export class SuperbuyExtractionService extends BaseService {
  constructor() {
    super("SuperbuyExtractionService");
  }

  /**
   * Extract parcels directly from Superbuy using Puppeteer
   * Returns normalized parcel data ready for sync
   */
  async extractParcels(userId: string): Promise<ExtractionResult> {
    return this.executeOperation("extractParcels", async () => {
      const steps: ExtractionStep[] = [];

      const pushStep = (
        type: ExtractionStep['type'],
        status: ExtractionStep['status'],
        message: string,
        progress?: number,
        data?: Record<string, unknown>
      ) => {
        const step: ExtractionStep = {
          type,
          status,
          message,
          ...(progress !== undefined && { progress }),
          ...(data && { data }),
          timestamp: new Date().toISOString(),
        };
        steps.push(step);
        this.logger.info(`[Extraction] ${type}: ${message}`, { status, progress });
      };

      try {
        pushStep('extraction', 'running', 'Connexion à Superbuy et extraction des parcelles...');

        // Run the extraction
        const extractedData = await this.runSuperbuyExtractionDirect();

        pushStep('extraction', 'success', `${extractedData.length} parcelles extraites ✓`, 33);

        if (extractedData.length === 0) {
          pushStep('extraction', 'error', 'Aucune parcelle trouvée sur Superbuy');
          return {
            success: false,
            parcels: [],
            steps,
            error: 'Aucune parcelle trouvée sur Superbuy',
          };
        }

        // Normalize data
        pushStep('normalization', 'running', `Normalisation de ${extractedData.length} parcelles...`);

        const normalizedData = extractedData.map(parcel => ({
          parcelId: parcel.parcelId,
          trackingNumber: parcel.trackingNumber,
          carrier: parcel.carrier,
          status: parcel.status,
          weight: parcel.weight,
          shippingFee: parcel.shippingFee,
          goodsName: parcel.goodsName || '',
          warehouseName: parcel.warehouseName || '',
          packageId: parcel.packageId,
        }));

        pushStep('normalization', 'success', `${normalizedData.length} parcelles normalisées ✓`, 66);

        return {
          success: true,
          parcels: normalizedData,
          steps,
        };

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
        pushStep('extraction', 'error', `Erreur extraction: ${errorMsg}`);

        const isAuthError =
          errorMsg.includes('authentifié') ||
          errorMsg.includes('login') ||
          errorMsg.includes('Session') ||
          errorMsg.includes('expire') ||
          errorMsg.includes('reconnecter') ||
          errorMsg.includes('invalide');

        if (isAuthError) {
          this.logger.warn('[Extraction] 🔒 Erreur d\'authentification détectée:', { error: errorMsg });
          return {
            success: false,
            parcels: [],
            steps,
            error: errorMsg || 'Session Superbuy invalide ou expirée. Veuillez vous reconnecter.',
            needsAuth: true,
          };
        }

        // Other extraction errors
        this.logger.error('[Extraction] ❌ Erreur extraction:', { error: errorMsg });
        return {
          success: false,
          parcels: [],
          steps,
          error: `Échec de l'extraction: ${errorMsg}`,
        };
      }
    }, { userId });
  }

  /**
   * Internal method to run actual Puppeteer extraction
   * This should be implemented with the Puppeteer logic
   * For now, it's a placeholder that throws an error
   */
  private async runSuperbuyExtractionDirect(): Promise<ExtractedParcel[]> {
    // TODO: Implement actual Puppeteer extraction logic here
    // This should launch browser, navigate to Superbuy, extract parcel data
    throw new Error("Puppeteer extraction not yet implemented in service");
  }

  /**
   * Convert extracted parcels to Superbuy-like format for sync service
   */
  convertToSuperbuyFormat(parcels: ExtractedParcel[]) {
    return parcels.map((raw) => ({
      packageOrderNo: raw.parcelId,
      packageId: String(raw.packageId || String(raw.parcelId || '').replace(/\D/g, '') || '0'),
      trackingNumber: raw.trackingNumber,
      carrier: raw.carrier,
      status: raw.status,
      packageRealWeight: raw.weight,
      packageWeight: raw.weight,
      weight: raw.weight,
      packageTotalAmount: raw.shippingFee,
      shippingFee: raw.shippingFee,
      warehouseName: raw.warehouseName,
      goodsName: raw.goodsName,
      deliveryCompanyName: raw.carrier,
      rawPackageInfo: {
        packageNo: raw.parcelId,
        expressNo: raw.trackingNumber,
        packageRealWeight: raw.weight,
        packagePrice: raw.shippingFee,
        deliveryCompanyName: raw.carrier,
        warehouseName: raw.warehouseName,
        packageStatusName: raw.status,
      },
    }));
  }
}

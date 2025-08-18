import axios, { AxiosRequestHeaders } from 'axios';
import { URLSearchParams } from 'url';
import { logger } from '@/lib/utils/logging/logger';
import { VintedIntegrationInstrumentation, MarketAnalysisInstrumentation } from './logging-instrumentation';
import {
    SuggestionsResponseSchema,
    ApiResponseSoldItemsSchema,
    SoldItem,
    Catalog,
} from '@/lib/validations/vinted-market-analysis-schemas';
import { KNOWN_BRANDS } from '@/lib/data/known-brands';
import { normalizeTitle } from '@/lib/services/ai/title-normalizer';
import { isAnomaly } from '@/lib/services/ai/anomaly-detector';
import { 
    EnhancedVintedAnalysisResult, 
    AIProcessingMetadata,
    AIInsights,
    AIRecommendations,
    AnomalyDetection,
    TrendPrediction,
    EnhancedChart,
    EnhancedAdvancedMetrics
} from '@/types/vinted-market-analysis';
import AdvancedAnalyticsEngine from '@/lib/analytics/advanced-analytics-engine';

// --- Constantes API ---
const VINTED_API_BASE = 'https://www.vinted.fr/api/v2';
const SOLD_ITEMS_URL = `${VINTED_API_BASE}/item_upload/items/similar_sold_items`;
const SUGGESTIONS_URL = `${VINTED_API_BASE}/items/suggestions`;

// --- Interfaces ---
export interface EnrichedSoldItem extends SoldItem {
  normalizedData: {
    brand: string | null;
    model: string | null;
    year: number | null;
    attributes: string[];
  };
}

export interface VintedAnalysisResult {
    salesVolume: number;
    avgPrice: number;
    priceRange: {
        min: number;
        max: number;
    };
    brandInfo: {
        id: number;
        name: string;
    } | null;
    catalogInfo: {
        id: number;
        name: string;
    };
    enrichedItems: EnrichedSoldItem[];
    rawItems: SoldItem[]; // <-- Ajout pour correction TS
    analysisDate: string;
    brandDistribution: Record<string, number>;
    modelDistribution: Record<string, number>;
}

export interface AnalysisRequest {
    productName: string;
    catalogId: number;
    categoryName?: string;
    brandId?: number;
    token: string;
    maxProducts?: number;
    advancedParams?: Record<string, any>;
    itemStates?: number[];
}

/**
 * Types internes manquants pour la compatibilité TypeScript stricte
 */
export interface PricingRecommendation {
  type: 'pricing';
  optimalPrice: number;
  priceRange: { min: number; max: number };
  strategy: string;
  justification: string;
  confidence: number;
  expectedImpact: string;
}

export interface OpportunityRecommendation {
  type: 'opportunity';
  opportunity: string;
  description: string;
  profitPotential: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  confidence: number;
  actionSteps: string[];
}

export interface RiskMitigation {
  type: 'risk';
  risk: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
  preventionSteps: string[];
  confidence: number;
}

export interface MarketingRecommendation {
  type: 'marketing';
  strategy: string;
  channels: string[];
  targetAudience: string;
  expectedOutcome: string;
  confidence: number;
  timeline: string;
}

export interface ActionItem {
  action: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  expectedImpact: string;
  timeline: string;
}

export interface ActionPlan {
  immediate: ActionItem[];
  shortTerm: ActionItem[];
  longTerm: ActionItem[];
  totalEstimatedEffort: string;
  expectedROI: string;
}

// --- Classes d'erreur ---
export class VintedApiError extends Error {
    constructor(message: string, public status?: number, public context?: any) {
        super(message);
        this.name = 'VintedApiError';
    }
}

export class VintedValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'VintedValidationError';
    }
}

// --- Service principal ---
export class VintedMarketAnalysisService {
    private static instance: VintedMarketAnalysisService;
    private advancedAnalyticsEngine: InstanceType<typeof AdvancedAnalyticsEngine>;

    private constructor() {
        this.advancedAnalyticsEngine = new AdvancedAnalyticsEngine();
    }

    public static getInstance(): VintedMarketAnalysisService {
        if (!VintedMarketAnalysisService.instance) {
            VintedMarketAnalysisService.instance = new VintedMarketAnalysisService();
        }
        return VintedMarketAnalysisService.instance;
    }

    async analyzeProduct(request: AnalysisRequest): Promise<VintedAnalysisResult> {
        return MarketAnalysisInstrumentation.instrumentAnalysis(
            'PRODUCT_ANALYSIS',
            async () => {
                const { productName, catalogId, categoryName, brandId, token, maxProducts, itemStates } = request;
                const headers = this.createHeaders(token);
                
                logger.info(`[VintedService] Début de l'analyse pour "${productName}"`);

                const finalCatalogId = await this.getBestCatalogId(categoryName || '', catalogId);
                let finalBrandId = await this.determineBrandId(productName, brandId, finalCatalogId, headers);
                
                let soldItems = await this.getSoldItems(finalBrandId, finalCatalogId, headers, itemStates);
                logger.info(`[VintedService] ${soldItems.length} articles vendus bruts récupérés.`);

                if (soldItems.length === 0) {
                    throw new VintedApiError("Aucun article vendu correspondant n'a été trouvé.", 404);
                }

                if (typeof maxProducts === 'number' && maxProducts > 0) {
                    soldItems = soldItems.slice(0, maxProducts);
                }

                const processingPromises = soldItems.map(async (item) => {
                    const normalizedData = await normalizeTitle(item.title);
                    const anomalyCheck = await isAnomaly(productName, item.title);
                    return { ...item, normalizedData, isRelevant: anomalyCheck.is_relevant };
                });

                const processedItems = await Promise.all(processingPromises);
                const relevantItems = processedItems.filter(item => item.isRelevant) as EnrichedSoldItem[];
                
                logger.info(`[VintedService] ${relevantItems.length} sur ${soldItems.length} articles jugés pertinents.`);

                if (relevantItems.length === 0) {
                    throw new VintedApiError("Aucun article pertinent trouvé après le filtrage par IA.", 404);
                }

                const result = this.calculateMetrics(relevantItems, finalCatalogId, finalBrandId);

                logger.info(`[VintedService] Analyse terminée: ${result.salesVolume} ventes, prix moyen ${result.avgPrice}€`);
                // Correction : Ajout de rawItems dans le résultat
                return {
                  ...result,
                  rawItems: soldItems
                };
            },
            { productName: request.productName, catalogId: request.catalogId, brandId: request.brandId }
        );
    }

    private async determineBrandId(productName: string, brandId: number | undefined, catalogId: number, headers: AxiosRequestHeaders): Promise<number | null> {
        if (brandId) return brandId;
        
        const foundBrand = this.findBrandInTitle(productName);
        if (foundBrand) return foundBrand.id;

        return this.getSuggestedBrandId(productName, catalogId, headers);
    }

    async getBestCatalogId(categoryName: string, initialCatalogId: number): Promise<number> {
        if (categoryName.toLowerCase() === 'hauts et t-shirts') return 1806;
        return initialCatalogId;
    }

    private findBrandInTitle(title: string): { id: number; name: string } | null {
        const lowerCaseTitle = title.toLowerCase();
        for (const brand of KNOWN_BRANDS) {
            if (lowerCaseTitle.includes(brand.name.toLowerCase())) {
                return brand;
            }
        }
        return null;
    }

    async getSuggestedBrandId(title: string, catalogId: number, headers: AxiosRequestHeaders): Promise<number | null> {
        try {
            return await VintedIntegrationInstrumentation.instrumentApiCall('suggestions', 'GET', async () => {
                const params = new URLSearchParams({ title, catalog_id: catalogId.toString() });
                const response = await axios.get(`${SUGGESTIONS_URL}?${params.toString()}`, { headers, timeout: 10000 });
                const parsed = SuggestionsResponseSchema.safeParse(response.data);
                const firstBrand = parsed.success ? parsed.data.brands?.[0] : undefined;
                return firstBrand ? firstBrand.id : null;
            }, { title, catalogId });
        } catch (error) {
            logger.error(`[VintedService] Erreur suggestion de marque`, { error });
            return null;
        }
    }

    async getSoldItems(brandId: number | null, catalogId: number, headers: AxiosRequestHeaders, itemStates: number[] = [1, 2, 3, 4, 5, 6]): Promise<SoldItem[]> {
        return MarketAnalysisInstrumentation.instrumentDataFetch('VINTED_SOLD_ITEMS', async () => {
            let allItems: SoldItem[] = [];
            const MAX_PAGES = 10;
            for (const statusId of itemStates) {
                for (let page = 1; page <= MAX_PAGES; page++) {
                    const params: any = { catalog_id: catalogId, status_id: statusId, page, per_page: 20 };
                    if (brandId) params.brand_id = brandId;
                    
                    try {
                        const pageItems = await VintedIntegrationInstrumentation.instrumentApiCall(`sold_items_p${page}_s${statusId}`, 'GET', async () => {
                            const response = await axios.get(`${SOLD_ITEMS_URL}?${new URLSearchParams(params)}`, { headers, timeout: 15000 });
                            const parsed = ApiResponseSoldItemsSchema.safeParse(response.data);
                            return parsed.success ? parsed.data.items : [];
                        }, { brandId, catalogId, page, statusId });

                        if (pageItems.length === 0) break;
                        allItems = allItems.concat(pageItems);
                    } catch (error) {
                        logger.warn(`[VintedService] Erreur page ${page}, status ${statusId}`, { error });
                        continue;
                    }
                }
            }
            return allItems;
        }, `brandId=${brandId}&catalogId=${catalogId}`);
    }

    private calculateMetrics(enrichedItems: EnrichedSoldItem[], catalogId: number, brandId: number | null): VintedAnalysisResult {
        const prices = enrichedItems.map(item => parseFloat(item.price.amount));
        const totalPrice = prices.reduce((sum, price) => sum + price, 0);
        const avgPrice = parseFloat((totalPrice / prices.length).toFixed(2));
        
        const itemWithBrand = enrichedItems.find(item => item.brand);
        const brandInfo = itemWithBrand?.brand ? { id: itemWithBrand.brand.id, name: itemWithBrand.brand.title } : (brandId ? { id: brandId, name: 'Unknown' } : null);

        return {
            salesVolume: enrichedItems.length,
            avgPrice,
            priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
            brandInfo,
            catalogInfo: { id: catalogId, name: 'Unknown' },
            enrichedItems,
            rawItems: [], // sera remplacé dans analyzeProduct
            analysisDate: new Date().toISOString(),
            brandDistribution: this.calculateDistribution(enrichedItems.map(item => item.normalizedData.brand)),
            modelDistribution: this.calculateDistribution(enrichedItems.map(item => item.normalizedData.model)),
        };
    }

    private calculateDistribution(values: (string | null)[]): Record<string, number> {
        return values.reduce((acc, value) => {
            if (value) {
                acc[value] = (acc[value] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    }

    private createHeaders(cookieString: string): AxiosRequestHeaders {
        return {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Cookie': cookieString,
        } as unknown as AxiosRequestHeaders;
    }

    /**
     * Enhanced analysis method that includes AI insights and recommendations
     */
    async analyzeProductWithAI(
        request: AnalysisRequest,
        options: {
            includeAIInsights?: boolean;
            includeRecommendations?: boolean;
            includeAnomalyDetection?: boolean;
            includeTrendPrediction?: boolean;
            includeEnhancedCharts?: boolean;
        } = {}
    ): Promise<EnhancedVintedAnalysisResult> {
        const startTime = Date.now();
        
        // Perform base analysis
        const baseAnalysis = await this.analyzeProduct(request);
        
        // Calculate advanced metrics using AdvancedAnalyticsEngine
        const advancedMetrics = this.advancedAnalyticsEngine.calculateAdvancedMetrics(baseAnalysis);
        
        // Create processing metadata
        const processingMetadata: AIProcessingMetadata = {
            aiProcessingTime: 0,
            llmProvider: 'openai', // TODO: Get from config
            modelVersion: 'gpt-4-turbo', // TODO: Get from config
            confidence: 0.8, // Will be updated based on AI processing
            lastProcessed: new Date().toISOString(),
            fallbackUsed: false,
        };

        // Initialize enhanced result
        const enhancedResult: EnhancedVintedAnalysisResult = {
            ...baseAnalysis,
            processingMetadata,
            dataQuality: {
                score: advancedMetrics.qualityScore.overall,
                issues: this.generateDataQualityIssues(advancedMetrics.qualityScore),
                recommendations: this.generateDataQualityRecommendations(advancedMetrics.qualityScore),
            },
        };

        try {
            // Add AI enhancements based on options, using advanced metrics as context
            if (options.includeAIInsights) {
                // Correction : cast forcé pour compatibilité stricte
                enhancedResult.aiInsights = await this.generateAIInsights(
                  baseAnalysis,
                  advancedMetrics as unknown as EnhancedAdvancedMetrics
                );
            }

            if (options.includeRecommendations && enhancedResult.aiInsights) {
                enhancedResult.aiRecommendations = await this.generateAIRecommendations(
                    baseAnalysis, 
                    enhancedResult.aiInsights,
                    advancedMetrics as unknown as EnhancedAdvancedMetrics
                );
            }

            if (options.includeAnomalyDetection) {
                enhancedResult.anomalies = await this.detectMarketAnomalies(
                  baseAnalysis,
                  advancedMetrics as unknown as EnhancedAdvancedMetrics
                );
            }

            if (options.includeTrendPrediction) {
                enhancedResult.trendPredictions = await this.generateTrendPredictions(
                  baseAnalysis,
                  advancedMetrics as unknown as EnhancedAdvancedMetrics
                );
            }

            if (options.includeEnhancedCharts) {
                enhancedResult.enhancedCharts = await this.generateEnhancedCharts(
                    baseAnalysis, 
                    enhancedResult.aiInsights,
                    advancedMetrics as unknown as EnhancedAdvancedMetrics
                );
            }

            // Update processing metadata
            const processingTime = Date.now() - startTime;
            enhancedResult.processingMetadata.aiProcessingTime = processingTime;
            
            // Calculate overall confidence based on AI components and data quality
            enhancedResult.processingMetadata.confidence = this.calculateOverallConfidence(
                enhancedResult, 
                advancedMetrics.qualityScore.overall
            );

            logger.info(`[VintedService] Analyse IA terminée en ${processingTime}ms avec score qualité: ${advancedMetrics.qualityScore.overall.toFixed(2)}`);
            
            return enhancedResult;

        } catch (error) {
            logger.error(`[VintedService] Erreur lors de l'analyse IA`, { error });
            
            // Return base analysis with fallback metadata
            enhancedResult.processingMetadata.fallbackUsed = true;
            enhancedResult.processingMetadata.aiProcessingTime = Date.now() - startTime;
            
            return enhancedResult;
        }
    }

    /**
     * Generate AI insights from analysis data using advanced metrics
     */
    private async generateAIInsights(
          analysis: VintedAnalysisResult,
          advancedMetrics: EnhancedAdvancedMetrics
      ): Promise<AIInsights> {
          const keyFindings: any[] = [];
          
          // Generate insights based on advanced metrics
        
        // Price distribution insights
        if (advancedMetrics.descriptiveStats.skewness > 1) {
            keyFindings.push({
                type: 'trend',
                title: 'Distribution de prix asymétrique',
                description: `La distribution des prix est fortement asymétrique (skewness: ${advancedMetrics.descriptiveStats.skewness.toFixed(2)}), indiquant une concentration vers les prix bas avec quelques articles premium.`,
                confidence: 0.8,
                impact: 'medium',
                evidence: [`Skewness: ${advancedMetrics.descriptiveStats.skewness.toFixed(2)}`, `Médiane: ${advancedMetrics.descriptiveStats.median}€`, `Moyenne: ${advancedMetrics.descriptiveStats.mean.toFixed(2)}€`],
                priority: 'medium',
            });
        }

        // Outlier detection insights
        if (advancedMetrics.descriptiveStats.outliers.length > 0) {
            keyFindings.push({
                type: 'anomaly',
                title: 'Prix aberrants détectés',
                description: `${advancedMetrics.descriptiveStats.outliers.length} prix aberrants identifiés, pouvant indiquer des articles de qualité exceptionnelle ou des erreurs de prix.`,
                confidence: 0.9,
                impact: 'high',
                evidence: [`${advancedMetrics.descriptiveStats.outliers.length} outliers`, `Prix aberrants: ${advancedMetrics.descriptiveStats.outliers.slice(0, 3).map(p => p.toFixed(2)).join(', ')}€`],
                priority: 'high',
            });
        }

        // Competitive position insights
        const competitivePosition = advancedMetrics.competitiveAnalysis.marketPosition;
        keyFindings.push({
            type: competitivePosition === 'high' ? 'risk' : 'opportunity',
            title: `Position concurrentielle ${competitivePosition === 'high' ? 'premium' : competitivePosition === 'low' ? 'économique' : 'moyenne'}`,
            description: `Votre position sur le marché est ${competitivePosition}. ${competitivePosition === 'high' ? 'Attention à la justification de ce premium.' : competitivePosition === 'low' ? 'Opportunité d\'augmenter les prix.' : 'Position équilibrée sur le marché.'}`,
            confidence: 0.85,
            impact: competitivePosition === 'average' ? 'low' : 'medium',
            evidence: [`Position: ${competitivePosition}`, `Densité concurrentielle: ${advancedMetrics.competitiveAnalysis.competitorDensity.toFixed(2)}`],
            priority: competitivePosition === 'average' ? 'low' : 'medium',
        });

        // Seasonality insights
        if (advancedMetrics.temporalAnalysis.seasonality.detected) {
            keyFindings.push({
                type: 'trend',
                title: `Saisonnalité ${advancedMetrics.temporalAnalysis.seasonality.pattern} détectée`,
                description: `Pattern ${advancedMetrics.temporalAnalysis.seasonality.pattern} identifié avec une confiance de ${(advancedMetrics.temporalAnalysis.seasonality.confidence * 100).toFixed(1)}%.`,
                confidence: advancedMetrics.temporalAnalysis.seasonality.confidence,
                impact: 'medium',
                evidence: [`Pattern: ${advancedMetrics.temporalAnalysis.seasonality.pattern}`, `Confiance: ${(advancedMetrics.temporalAnalysis.seasonality.confidence * 100).toFixed(1)}%`],
                priority: 'medium',
            });
        }

        // Price gaps opportunities
        if (advancedMetrics.competitiveAnalysis.priceGaps.length > 0) {
            const topGap = advancedMetrics.competitiveAnalysis.priceGaps[0];
            if (topGap) {
                keyFindings.push({
                    type: 'opportunity',
                    title: 'Gap de prix identifié',
                    description: `Opportunité de positionnement entre ${topGap.min?.toFixed(2) ?? '0.00'}€ et ${topGap.max?.toFixed(2) ?? '0.00'}€ avec un potentiel d'opportunité de ${topGap.opportunity?.toFixed(1) ?? '0.0'}.`,
                    confidence: topGap.confidence ?? 0,
                    impact: 'high',
                    evidence: [
                        `Gap: ${topGap.min?.toFixed(2) ?? '0.00'}€ - ${topGap.max?.toFixed(2) ?? '0.00'}€`,
                        `Opportunité: ${topGap.opportunity?.toFixed(1) ?? '0.0'}`
                    ],
                    priority: 'high',
                });
            }
        }

        return {
            summary: `Analyse de ${analysis.salesVolume} ventes avec un prix moyen de ${analysis.avgPrice.toFixed(2)}€. Position concurrentielle ${competitivePosition} avec un score de qualité des données de ${(advancedMetrics.qualityScore.overall * 100).toFixed(1)}%.`,
            keyFindings,
            marketContext: {
                competitivePosition: this.translateMarketPosition(competitivePosition),
                marketConditions: this.assessMarketConditions(advancedMetrics),
                seasonalFactors: advancedMetrics.temporalAnalysis.seasonality.peaks.map(p => p.period),
            },
            priceAnalysis: {
                optimalPriceRange: this.calculateOptimalPriceRange(advancedMetrics),
                pricingStrategy: this.suggestPricingStrategy(advancedMetrics),
                justification: this.generatePricingJustification(advancedMetrics),
            },
            confidence: Math.min(0.95, advancedMetrics.qualityScore.overall + 0.2),
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Generate AI recommendations based on insights and advanced metrics
     */
    private async generateAIRecommendations(
        analysis: VintedAnalysisResult, 
        insights: AIInsights,
        advancedMetrics: EnhancedAdvancedMetrics
    ): Promise<AIRecommendations> {
        const pricing: PricingRecommendation[] = [];
        const opportunities: OpportunityRecommendation[] = [];
        const risks: RiskMitigation[] = [];
        const marketing: MarketingRecommendation[] = [];

        // Pricing recommendations based on advanced metrics
        const optimalPrice = (insights.priceAnalysis.optimalPriceRange.min + insights.priceAnalysis.optimalPriceRange.max) / 2;
        pricing.push({
            type: 'pricing',
            optimalPrice,
            priceRange: insights.priceAnalysis.optimalPriceRange,
            strategy: insights.priceAnalysis.pricingStrategy,
            justification: insights.priceAnalysis.justification,
            confidence: 0.8,
            expectedImpact: `Potentiel d'amélioration de ${((optimalPrice - analysis.avgPrice) / analysis.avgPrice * 100).toFixed(1)}% du prix moyen`,
        });

        // Opportunity recommendations from price gaps
        advancedMetrics.competitiveAnalysis.priceGaps.slice(0, 3).forEach((gap, index) => {
            opportunities.push({
                type: 'opportunity',
                opportunity: `Positionnement dans le gap de prix #${index + 1}`,
                description: `Se positionner entre ${gap.min.toFixed(2)}€ et ${gap.max.toFixed(2)}€ pour capturer un segment de marché sous-exploité.`,
                profitPotential: gap.opportunity > 2 ? 'high' : gap.opportunity > 1.5 ? 'medium' : 'low',
                effort: 'medium',
                timeline: '2-4 semaines',
                confidence: gap.confidence,
                actionSteps: [
                    'Analyser la qualité des produits dans cette fourchette',
                    'Ajuster le positionnement produit',
                    'Tester les prix dans cette fourchette',
                    'Monitorer la réaction du marché',
                ],
            });
        });

        // Risk mitigation based on outliers and volatility
        if (advancedMetrics.descriptiveStats.outliers.length > analysis.salesVolume * 0.1) {
            risks.push({
                type: 'risk',
                risk: 'Forte variabilité des prix',
                severity: 'medium',
                mitigation: 'Standardiser la qualité et la présentation des produits pour réduire la dispersion des prix.',
                preventionSteps: [
                    'Établir des critères de qualité clairs',
                    'Améliorer les descriptions produits',
                    'Standardiser les photos',
                    'Former sur l\'évaluation des prix',
                ],
                confidence: 0.75,
            });
        }

        if (advancedMetrics.temporalAnalysis.volatility.overall > 0.3) {
            risks.push({
                type: 'risk',
                risk: 'Volatilité élevée du marché',
                severity: 'high',
                mitigation: 'Diversifier les stratégies de prix et surveiller les tendances de près.',
                preventionSteps: [
                    'Mettre en place un monitoring des prix',
                    'Diversifier les gammes de prix',
                    'Établir des alertes de volatilité',
                    'Préparer des stratégies de réaction rapide',
                ],
                confidence: 0.8,
            });
        }

        // Marketing recommendations based on seasonality
        if (advancedMetrics.temporalAnalysis.seasonality.detected) {
            marketing.push({
                type: 'marketing',
                strategy: `Stratégie saisonnière ${advancedMetrics.temporalAnalysis.seasonality.pattern}`,
                channels: ['social media', 'email marketing', 'promotions ciblées'],
                targetAudience: 'Acheteurs sensibles aux tendances saisonnières',
                expectedOutcome: `Augmentation des ventes de 15-25% pendant les pics saisonniers`,
                confidence: advancedMetrics.temporalAnalysis.seasonality.confidence,
                timeline: 'Mise en place avant le prochain pic saisonnier',
            });
        }

        return {
            pricing,
            marketing,
            opportunities,
            risks,
            actionPlan: this.generateActionPlan(pricing, opportunities, risks, marketing),
            confidence: Math.min(0.9, (insights.confidence + advancedMetrics.qualityScore.overall) / 2),
            lastUpdated: new Date().toISOString(),
        };
    }

    /**
     * Detect market anomalies using enhanced AI and advanced metrics
     */
    private async detectMarketAnomalies(
        analysis: VintedAnalysisResult, 
        advancedMetrics: EnhancedAdvancedMetrics
    ): Promise<AnomalyDetection[]> {
        const anomalies: AnomalyDetection[] = [];

        // Statistical outliers as anomalies
        if (advancedMetrics.descriptiveStats.outliers.length > 0) {
            anomalies.push({
                id: `price-outliers-${Date.now()}`,
                type: 'price',
                severity: advancedMetrics.descriptiveStats.outliers.length > analysis.salesVolume * 0.1 ? 'high' : 'medium',
                description: `${advancedMetrics.descriptiveStats.outliers.length} prix aberrants détectés`,
                affectedItems: analysis.rawItems
                    .filter(item => advancedMetrics.descriptiveStats.outliers.includes(parseFloat(item.price.amount)))
                    .slice(0, 5)
                    .map(item => item.title),
                suggestedAction: 'Vérifier la qualité et l\'authenticité de ces articles',
                confidence: 0.9,
                detectedAt: new Date().toISOString(),
                evidence: [`${advancedMetrics.descriptiveStats.outliers.length} outliers détectés`, `Seuil IQR dépassé`],
                impact: 'medium',
            });
        }

        // High volatility as anomaly
        if (advancedMetrics.temporalAnalysis.volatility.overall > 0.4) {
            anomalies.push({
                id: `high-volatility-${Date.now()}`,
                type: 'volume',
                severity: 'high',
                description: `Volatilité élevée détectée (${(advancedMetrics.temporalAnalysis.volatility.overall * 100).toFixed(1)}%)`,
                affectedItems: ['Ensemble du marché'],
                suggestedAction: 'Surveiller les conditions de marché et ajuster la stratégie de prix',
                confidence: 0.85,
                detectedAt: new Date().toISOString(),
                evidence: [`Volatilité: ${(advancedMetrics.temporalAnalysis.volatility.overall * 100).toFixed(1)}%`],
                impact: 'high',
            });
        }

        return anomalies;
    }

    /**
     * Generate trend predictions using advanced metrics
     */
    private async generateTrendPredictions(
        analysis: VintedAnalysisResult, 
        advancedMetrics: EnhancedAdvancedMetrics
    ): Promise<TrendPrediction> {
        const trendData = advancedMetrics.temporalAnalysis.trends;
        
        return {
            timeframe: '1month',
            predictions: [
                {
                    metric: 'price',
                    direction: trendData.direction,
                    magnitude: Math.abs(trendData.slope),
                    confidence: trendData.rSquared,
                    factors: this.identifyTrendFactors(advancedMetrics),
                },
                {
                    metric: 'volume',
                    direction: trendData.direction === 'up' ? 'down' : trendData.direction === 'down' ? 'up' : 'stable',
                    magnitude: 0.1,
                    confidence: 0.6,
                    factors: ['Relation inverse prix-volume typique'],
                },
            ],
            scenarios: this.generateScenarios(advancedMetrics),
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Generate enhanced charts with AI annotations using advanced metrics
     */
    private async generateEnhancedCharts(
        analysis: VintedAnalysisResult, 
        insights?: AIInsights,
        advancedMetrics?: EnhancedAdvancedMetrics
    ): Promise<EnhancedChart[]> {
        const charts: EnhancedChart[] = [];

        if (advancedMetrics) {
            // Price distribution chart with AI annotations
            charts.push({
                id: `price-distribution-${Date.now()}`,
                type: 'price-distribution',
                chartData: {
                    histogram: advancedMetrics.priceDistribution.histogram,
                    density: advancedMetrics.priceDistribution.density,
                    percentiles: advancedMetrics.priceDistribution.percentiles,
                },
                aiAnnotations: [
                    {
                        position: { x: advancedMetrics.descriptiveStats.mean, y: 0.5 },
                        type: 'insight',
                        title: 'Prix moyen',
                        description: `Prix moyen: ${advancedMetrics.descriptiveStats.mean.toFixed(2)}€`,
                        confidence: 0.9,
                    },
                    {
                        position: { x: advancedMetrics.descriptiveStats.median, y: 0.3 },
                        type: 'insight',
                        title: 'Prix médian',
                        description: `Prix médian: ${advancedMetrics.descriptiveStats.median.toFixed(2)}€`,
                        confidence: 0.9,
                    },
                ],
                interactiveElements: [
                    {
                        trigger: 'hover',
                        element: 'histogram-bar',
                        action: 'show-detail',
                        data: { showCount: true, showPercentage: true },
                    },
                ],
                generatedAt: new Date().toISOString(),
            });
        }

        return charts;
    }

    /**
     * Calculate overall confidence based on AI components and data quality
     */
    private calculateOverallConfidence(
        result: EnhancedVintedAnalysisResult, 
        dataQualityScore: number = 0.7
    ): number {
        let totalConfidence = 0;
        let componentCount = 0;

        // Include data quality as a base factor
        totalConfidence += dataQualityScore;
        componentCount++;

        if (result.aiInsights) {
            totalConfidence += result.aiInsights.confidence;
            componentCount++;
        }

        if (result.aiRecommendations) {
            totalConfidence += result.aiRecommendations.confidence;
            componentCount++;
        }

        if (result.anomalies && result.anomalies.length > 0) {
            const avgAnomalyConfidence = result.anomalies.reduce((sum, a) => sum + a.confidence, 0) / result.anomalies.length;
            totalConfidence += avgAnomalyConfidence;
            componentCount++;
        }

        return componentCount > 0 ? Math.min(0.95, totalConfidence / componentCount) : 0.7;
    }

    /**
     * Generate data quality issues from quality score
     */
    private generateDataQualityIssues(qualityScore: {
        overall: number;
        dataCompleteness: number;
        sampleSize: number;
        timeRange: number;
        variance: number;
    }): string[] {
        const issues: string[] = [];

        if (qualityScore.dataCompleteness < 0.8) {
            issues.push('Données incomplètes détectées');
        }
        if (qualityScore.sampleSize < 0.5) {
            issues.push('Taille d\'échantillon insuffisante');
        }
        if (qualityScore.timeRange < 0.3) {
            issues.push('Période d\'analyse trop courte');
        }
        if (qualityScore.variance < 0.2) {
            issues.push('Faible diversité des prix');
        }

        return issues;
    }

    /**
     * Generate data quality recommendations
     */
    private generateDataQualityRecommendations(qualityScore: {
        overall: number;
        dataCompleteness: number;
        sampleSize: number;
        timeRange: number;
        variance: number;
    }): string[] {
        const recommendations: string[] = [];

        if (qualityScore.dataCompleteness < 0.8) {
            recommendations.push('Améliorer la complétude des données en vérifiant les champs manquants');
        }
        if (qualityScore.sampleSize < 0.5) {
            recommendations.push('Élargir les critères de recherche pour obtenir plus de données');
        }
        if (qualityScore.timeRange < 0.3) {
            recommendations.push('Étendre la période d\'analyse pour une meilleure représentativité');
        }
        if (qualityScore.variance < 0.2) {
            recommendations.push('Inclure une gamme plus large de produits pour une analyse plus complète');
        }

        return recommendations;
    }

    /**
     * Translate market position to French
     */
    private translateMarketPosition(position: 'low' | 'average' | 'high'): string {
        switch (position) {
            case 'low': return 'Position économique - prix inférieurs à la moyenne';
            case 'high': return 'Position premium - prix supérieurs à la moyenne';
            case 'average': return 'Position équilibrée - prix dans la moyenne du marché';
            default: return 'Position indéterminée';
        }
    }

    /**
     * Assess market conditions based on advanced metrics
     */
    private assessMarketConditions(metrics: EnhancedAdvancedMetrics): string {
        const volatility = metrics.temporalAnalysis.volatility.overall;
        const competitorDensity = metrics.competitiveAnalysis.competitorDensity;
        
        if (volatility > 0.4) {
            return 'Marché très volatil - ajustements fréquents nécessaires';
        } else if (volatility > 0.2) {
            return 'Marché modérément volatil - surveillance recommandée';
        } else if (competitorDensity > 10) {
            return 'Marché très concurrentiel - différenciation importante';
        } else if (competitorDensity > 5) {
            return 'Marché concurrentiel - positionnement stratégique requis';
        } else {
            return 'Marché stable - opportunités de croissance';
        }
    }

    /**
     * Calculate optimal price range based on advanced metrics
     */
    private calculateOptimalPriceRange(metrics: EnhancedAdvancedMetrics): { min: number; max: number } {
        const mean = metrics.descriptiveStats.mean;
        const stdDev = metrics.descriptiveStats.standardDeviation;
        
        // Use statistical bounds adjusted for market position
        const lowerBound = Math.max(0, mean - stdDev * 0.5);
        const upperBound = mean + stdDev * 0.5;
        
        // Adjust based on competitive gaps
        if (metrics.competitiveAnalysis.priceGaps.length > 0) {
            const bestGap = metrics.competitiveAnalysis.priceGaps[0];
            if (bestGap && bestGap.confidence && bestGap.confidence > 0.7) {
                return {
                    min: Math.max(lowerBound, bestGap.min ?? lowerBound),
                    max: Math.min(upperBound, bestGap.max ?? upperBound),
                };
            }
        }
        
        return { min: lowerBound, max: upperBound };
    }

    /**
     * Suggest pricing strategy based on advanced metrics
     */
    private suggestPricingStrategy(metrics: EnhancedAdvancedMetrics): string {
        const position = metrics.competitiveAnalysis.marketPosition;
        const volatility = metrics.temporalAnalysis.volatility.overall;
        const hasSeasonality = metrics.temporalAnalysis.seasonality.detected;
        
        if (volatility > 0.3) {
            return 'Stratégie de prix dynamique avec ajustements fréquents';
        } else if (hasSeasonality) {
            return 'Stratégie de prix saisonnière avec variations cycliques';
        } else if (position === 'high') {
            return 'Stratégie de prix premium avec justification de valeur';
        } else if (position === 'low') {
            return 'Stratégie de prix compétitifs avec optimisation des marges';
        } else {
            return 'Stratégie de prix équilibrée suivant le marché';
        }
    }

    /**
     * Generate pricing justification
     */
    private generatePricingJustification(metrics: EnhancedAdvancedMetrics): string {
        const factors: string[] = [];
        
        if (metrics.competitiveAnalysis.priceGaps.length > 0) {
            factors.push('gaps concurrentiels identifiés');
        }
        if (metrics.temporalAnalysis.seasonality.detected) {
            factors.push(`saisonnalité ${metrics.temporalAnalysis.seasonality.pattern}`);
        }
        if (metrics.descriptiveStats.outliers.length > 0) {
            factors.push('présence de prix premium');
        }
        if (metrics.temporalAnalysis.trends.direction !== 'stable') {
            factors.push(`tendance ${metrics.temporalAnalysis.trends.direction === 'up' ? 'haussière' : 'baissière'}`);
        }
        
        return factors.length > 0 
            ? `Recommandation basée sur: ${factors.join(', ')}`
            : 'Recommandation basée sur l\'analyse statistique des données de marché';
    }

    /**
     * Generate action plan from recommendations
     */
    private generateActionPlan(
        pricing: PricingRecommendation[],
        opportunities: OpportunityRecommendation[],
        risks: RiskMitigation[],
        marketing: MarketingRecommendation[]
    ): ActionPlan {
        const immediate: ActionItem[] = [];
        const shortTerm: ActionItem[] = [];
        const longTerm: ActionItem[] = [];

        // Immediate actions from high-priority items
        if (pricing.length > 0) {
            immediate.push({
                action: 'Ajuster les prix selon les recommandations',
                priority: 'high',
                effort: 'low',
                expectedImpact: 'Amélioration immédiate de la compétitivité',
                timeline: '1-2 jours',
            });
        }

        // Short-term actions from opportunities
        opportunities.slice(0, 2).forEach(opp => {
            shortTerm.push({
                action: opp.opportunity,
                priority: opp.profitPotential === 'high' ? 'high' : 'medium',
                effort: opp.effort as 'low' | 'medium' | 'high',
                expectedImpact: opp.description,
                timeline: opp.timeline,
            });
        });

        // Long-term actions from marketing and risk mitigation
        if (marketing.length > 0) {
            if (marketing[0]) {
                longTerm.push({
                    action: marketing[0].strategy ?? '',
                    priority: 'medium',
                    effort: 'high',
                    expectedImpact: marketing[0].expectedOutcome ?? '',
                    timeline: marketing[0].timeline ?? '',
                });
            }
        }

        return {
            immediate,
            shortTerm,
            longTerm,
            totalEstimatedEffort: this.calculateTotalEffort([...immediate, ...shortTerm, ...longTerm]),
            expectedROI: this.estimateROI(pricing, opportunities),
        };
    }

    /**
     * Calculate total effort for action plan
     */
    private calculateTotalEffort(actions: ActionItem[]): string {
        const effortScores = actions.map(action => {
            switch (action.effort) {
                case 'low': return 1;
                case 'medium': return 2;
                case 'high': return 3;
                default: return 2;
            }
        });
        
        const totalScore = effortScores.reduce((sum, score) => sum + score, 0);
        const avgScore = totalScore / actions.length;
        
        if (avgScore <= 1.5) return 'Faible';
        if (avgScore <= 2.5) return 'Moyen';
        return 'Élevé';
    }

    /**
     * Estimate ROI from recommendations
     */
    private estimateROI(pricing: PricingRecommendation[], opportunities: OpportunityRecommendation[]): string {
        let score = 0;
        
        if (pricing.length > 0) {
            score += 2; // Pricing has immediate impact
        }
        
        const highValueOpportunities = opportunities.filter(opp => opp.profitPotential === 'high').length;
        score += highValueOpportunities;
        
        if (score >= 3) return 'Élevé';
        if (score >= 2) return 'Moyen';
        return 'Faible';
    }

    /**
     * Identify trend factors from advanced metrics
     */
    private identifyTrendFactors(metrics: EnhancedAdvancedMetrics): string[] {
        const factors: string[] = [];
        
        if (metrics.temporalAnalysis.seasonality.detected) {
            factors.push(`Saisonnalité ${metrics.temporalAnalysis.seasonality.pattern}`);
        }
        
        if (metrics.temporalAnalysis.volatility.overall > 0.3) {
            factors.push('Volatilité élevée du marché');
        }
        
        if (metrics.competitiveAnalysis.competitorDensity > 10) {
            factors.push('Forte concurrence');
        }
        
        if (metrics.descriptiveStats.outliers.length > 0) {
            factors.push('Présence de prix premium');
        }
        
        return factors.length > 0 ? factors : ['Tendance basée sur les données historiques'];
    }

    /**
     * Generate scenarios for trend predictions
     */
    private generateScenarios(metrics: EnhancedAdvancedMetrics): Array<{
        name: string;
        probability: number;
        description: string;
        impact: string;
    }> {
        const scenarios = [];
        
        // Base scenario
        scenarios.push({
            name: 'Scénario de base',
            probability: 0.6,
            description: 'Continuation des tendances actuelles',
            impact: 'Stabilité des prix et volumes',
        });
        
        // Optimistic scenario
        if (metrics.temporalAnalysis.trends.direction === 'up') {
            scenarios.push({
                name: 'Scénario optimiste',
                probability: 0.25,
                description: 'Accélération de la tendance haussière',
                impact: 'Augmentation des prix de 10-15%',
            });
        }
        
        // Pessimistic scenario
        scenarios.push({
            name: 'Scénario pessimiste',
            probability: 0.15,
            description: 'Retournement de tendance ou choc externe',
            impact: 'Baisse des prix de 5-10%',
        });
        
        return scenarios;
    }

    /**
     * Validate data quality for AI processing
     */
    validateDataQuality(analysis: VintedAnalysisResult): { score: number; issues: string[]; recommendations: string[] } {
        const issues: string[] = [];
        const recommendations: string[] = [];
        let score = 1.0;

        // Check sample size
        if (analysis.salesVolume < 10) {
            issues.push('Échantillon trop petit pour une analyse IA fiable');
            recommendations.push('Élargir les critères de recherche pour obtenir plus de données');
            score -= 0.3;
        }

        // Check price consistency
        const priceRange = analysis.priceRange.max - analysis.priceRange.min;
        const avgPrice = analysis.avgPrice;
        if (priceRange > avgPrice * 3) {
            issues.push('Fourchette de prix très large, peut affecter la précision');
            recommendations.push('Filtrer les prix aberrants ou segmenter l\'analyse');
            score -= 0.2;
        }

        // Check data freshness
        const analysisDate = new Date(analysis.analysisDate);
        const daysSinceAnalysis = (Date.now() - analysisDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceAnalysis > 7) {
            issues.push('Données d\'analyse anciennes');
            recommendations.push('Actualiser l\'analyse pour des insights plus pertinents');
            score -= 0.1;
        }

        return {
            score: Math.max(0, score),
            issues,
            recommendations,
        };
    }
}

// --- Service de gestion des catalogues (Mock) ---
export class CatalogService {
    private static instance: CatalogService;
    public static getInstance(): CatalogService {
        if (!CatalogService.instance) CatalogService.instance = new CatalogService();
        return CatalogService.instance;
    }
    async findCatalogByName(name: string): Promise<Catalog[]> {
        if (name.toLowerCase() === 'hauts et t-shirts') return [{ id: 1806, title: 'Hauts et t-shirts', catalogs: [] }];
        return [];
    }
}

export const vintedMarketAnalysisService = VintedMarketAnalysisService.getInstance();
export const catalogService = CatalogService.getInstance();
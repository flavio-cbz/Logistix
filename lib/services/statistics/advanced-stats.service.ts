<<<<<<< HEAD

import { BaseService } from "../base-service";
import { databaseService } from "@/lib/database";
import { products, parcels } from "@/lib/database/schema";
import { eq, and, gte, lt, sql, desc, asc, count, type SQL } from "drizzle-orm";
import { StatsSearchParams } from "@/lib/schemas/stats";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/database/schema";
import { sqlFormulas } from "./sql-formulas";
import { calculateTrend, getDateRanges } from "./utils";

type DrizzleDB = BetterSQLite3Database<typeof schema>;

export class AdvancedStatsService extends BaseService {
    constructor() {
        super("AdvancedStatsService");
    }

    async getAdvancedStats(userId: string, params: StatsSearchParams) {
        return this.executeOperation("getAdvancedStats", async () => {
            const { period, groupBy } = params;
            const { startDate, previousStartDate, previousEndDate } = getDateRanges(period);

            const startDateStr = startDate.toISOString();
            const previousStartDateStr = previousStartDate.toISOString();
            const previousEndDateStr = previousEndDate.toISOString();

            return await databaseService.executeQuery((db) => {
                const vueEnsemble = this.getVueEnsemble(db, userId, startDateStr);
                const trends = this.calculateTrends(db, userId, vueEnsemble, period, previousStartDateStr, previousEndDateStr);
                const evolutionTemporelle = this.getEvolutionTemporelle(db, userId, groupBy, startDateStr);
                const performancePlateforme = this.getPerformancePlateforme(db, userId, startDateStr);
                const performanceParcel = this.getPerformanceParcel(db, userId, startDateStr);
                const topProduits = this.getTopProduits(db, userId, startDateStr);
                const flopProduits = this.getFlopProduits(db, userId, startDateStr);
                const delaisVente = this.getDelaisVente(db, userId, startDateStr);
                const produitsNonVendus = this.getProduitsNonVendus(db, userId, startDateStr);
                const analyseCouts = this.getAnalyseCouts(db, userId, startDateStr);

                const margeMoyenne = vueEnsemble.chiffreAffaires > 0
                    ? (vueEnsemble.beneficesTotal / vueEnsemble.chiffreAffaires) * 100
                    : 0;

                return {
                    periode: period,
                    groupBy: groupBy,
                    vueEnsemble: {
                        ...vueEnsemble,
                        margeMoyenne,
                        tauxVente: vueEnsemble.totalProduits > 0 ? (vueEnsemble.produitsVendus / vueEnsemble.totalProduits) * 100 : 0,
                        trends
                    },
                    evolutionTemporelle,
                    performancePlateforme,
                    performanceParcelle: performanceParcel,
                    topProduits,
                    flopProduits,
                    delaisVente,
                    produitsNonVendus,
                    analyseCouts,
                    lastUpdate: new Date().toISOString()
                };
            });
        }, { userId, ...params });
    }

    private getVueEnsemble(db: DrizzleDB, userId: string, startDateStr: string) {
        const result = db.select({
            totalProduits: count(),
            produitsVendus: sqlFormulas.countVendus,
            produitsEnLigne: sql<number>`SUM(CASE WHEN ${products.listedAt} IS NOT NULL AND ${products.vendu} = '0' THEN 1 ELSE 0 END)`,
            produitsStock: sql<number>`SUM(CASE WHEN ${products.listedAt} IS NULL AND ${products.vendu} = '0' THEN 1 ELSE 0 END)`,
            chiffreAffaires: sqlFormulas.sumChiffreAffairesVendus,
            beneficesTotal: sqlFormulas.sumBeneficesVendus,
            prixMoyenVente: sql<number>`COALESCE(AVG(CASE WHEN ${products.vendu} = '1' THEN ${products.sellingPrice} END), 0)`,
            prixMoyenAchat: sql<number>`COALESCE(AVG(${products.price}), 0)`,
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), gte(products.createdAt, startDateStr)))
            .get();

        return result || {
            totalProduits: 0, produitsVendus: 0, produitsEnLigne: 0, produitsStock: 0,
            chiffreAffaires: 0, beneficesTotal: 0, prixMoyenVente: 0, prixMoyenAchat: 0
        };
    }

    private calculateTrends(
        db: DrizzleDB, userId: string,
        vueEnsemble: { chiffreAffaires: number; produitsVendus: number; beneficesTotal: number; prixMoyenVente: number; totalProduits: number },
        period: string, previousStartDateStr: string, previousEndDateStr: string
    ) {
        if (period === 'all') {
            return { chiffreAffaires: 0, produitsVendus: 0, margeMoyenne: 0, prixMoyenVente: 0, beneficesTotal: 0, tauxVente: 0 };
        }

        const prevResult = db.select({
            produitsVendus: sqlFormulas.countVendus,
            chiffreAffaires: sqlFormulas.sumChiffreAffairesVendus,
            beneficesTotal: sqlFormulas.sumBeneficesVendus,
            prixMoyenVente: sql<number>`COALESCE(AVG(CASE WHEN ${products.vendu} = '1' THEN ${products.sellingPrice} END), 0)`,
            totalCount: count(),
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), gte(products.createdAt, previousStartDateStr), lt(products.createdAt, previousEndDateStr)))
            .get();

        const margeMoyenne = vueEnsemble.chiffreAffaires > 0 ? (vueEnsemble.beneficesTotal / vueEnsemble.chiffreAffaires) * 100 : 0;
        const prevMargeMoyenne = (prevResult?.chiffreAffaires ?? 0) > 0 ? ((prevResult?.beneficesTotal ?? 0) / (prevResult?.chiffreAffaires ?? 1)) * 100 : 0;
        const prevTauxVente = (prevResult?.totalCount ?? 0) > 0 ? ((prevResult?.produitsVendus ?? 0) / (prevResult?.totalCount ?? 1)) * 100 : 0;

        return {
            chiffreAffaires: calculateTrend(vueEnsemble.chiffreAffaires, prevResult?.chiffreAffaires ?? 0),
            produitsVendus: calculateTrend(vueEnsemble.produitsVendus, prevResult?.produitsVendus ?? 0),
            margeMoyenne: margeMoyenne - prevMargeMoyenne,
            prixMoyenVente: calculateTrend(vueEnsemble.prixMoyenVente, prevResult?.prixMoyenVente ?? 0),
            beneficesTotal: calculateTrend(vueEnsemble.beneficesTotal, prevResult?.beneficesTotal ?? 0),
            tauxVente: ((vueEnsemble.produitsVendus / (vueEnsemble.totalProduits || 1)) * 100) - prevTauxVente
        };
    }

    private getEvolutionTemporelle(db: DrizzleDB, userId: string, groupBy: string, startDateStr: string) {
        let groupByClause: SQL<unknown>;
        let dateFormat: SQL<unknown>;

        switch (groupBy) {
            case 'week':
                groupByClause = sql`strftime('%Y-%W', ${products.soldAt})`;
                dateFormat = sql`strftime('%Y-W%W', ${products.soldAt})`;
                break;
            case 'month':
                groupByClause = sql`strftime('%Y-%m', ${products.soldAt})`;
                dateFormat = sql`strftime('%Y-m', ${products.soldAt})`;
                break;
            case 'day':
            default:
                groupByClause = sql`DATE(${products.soldAt})`;
                dateFormat = sql`strftime('%Y-%m-%d', ${products.soldAt})`;
                break;
        }

        return db.select({
            periode: dateFormat,
            nbVentes: count(),
            chiffreAffaires: sqlFormulas.sumChiffreAffaires,
            benefices: sqlFormulas.sumBenefices,
            prixMoyenVente: sql<number>`COALESCE(AVG(${products.sellingPrice}), 0)`,
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), sql`${products.soldAt} IS NOT NULL`, gte(products.soldAt, startDateStr)))
            .groupBy(groupByClause)
            .orderBy(asc(dateFormat))
            .all()
            .map((e) => ({
                ...e,
                margeMoyenne: e.chiffreAffaires > 0 ? (e.benefices / e.chiffreAffaires) * 100 : 0
            }));
    }

    private getPerformancePlateforme(db: DrizzleDB, userId: string, startDateStr: string) {
        const totalVentes = db.select({ count: count() })
            .from(products)
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), gte(products.soldAt, startDateStr)))
            .get()?.count || 0;

        return db.select({
            plateforme: sql<string>`COALESCE(${products.plateforme}, 'Non spécifié')`,
            nbVentes: count(),
            chiffreAffaires: sqlFormulas.sumChiffreAffaires,
            benefices: sqlFormulas.sumBenefices,
            prixMoyenVente: sql<number>`COALESCE(AVG(${products.sellingPrice}), 0)`,
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), gte(products.soldAt, startDateStr)))
            .groupBy(products.plateforme)
            .orderBy(desc(sqlFormulas.sumChiffreAffaires))
            .all()
            .map((p: { chiffreAffaires: number; benefices: number; nbVentes: number }) => ({
                ...p,
                margeMoyenne: p.chiffreAffaires > 0 ? (p.benefices / p.chiffreAffaires) * 100 : 0,
                partMarche: totalVentes > 0 ? (p.nbVentes / totalVentes) * 100 : 0
            }));
    }

    private getPerformanceParcel(db: DrizzleDB, userId: string, startDateStr: string) {
        return db.select({
            parcelId: products.parcelId,
            parcelNumero: sql<string>`COALESCE(${parcels.superbuyId}, 'Sans parcelle')`,
            parcelNom: sql<string>`COALESCE(${parcels.name}, '')`,
            nbProduitsTotal: count(),
            nbProduitsVendus: sqlFormulas.countVendus,
            chiffreAffaires: sqlFormulas.sumChiffreAffairesVendus,
            coutTotal: sql<number>`COALESCE(SUM(${sqlFormulas.coutTotal}), 0)`,
            beneficesTotal: sqlFormulas.sumBeneficesVendus,
            prixParGramme: sql<number>`COALESCE(${parcels.pricePerGram}, 0)`,
            poidsTotal: sql<number>`COALESCE(SUM(${products.poids}), 0)`,
            coutLivraisonTotal: sql<number>`COALESCE(SUM(${sqlFormulas.coutLivraison}), 0)`,
            trackingNumber: sql<string>`COALESCE(${parcels.trackingNumber}, '')`,
            carrier: sql<string>`COALESCE(${parcels.carrier}, '')`,
            status: sql<string>`COALESCE(${parcels.status}, 'Inconnu')`,
            createdAt: sql<string>`COALESCE(${parcels.createdAt}, datetime('now'))`
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), gte(products.createdAt, startDateStr)))
            .groupBy(products.parcelId)
            .orderBy(desc(sqlFormulas.sumBeneficesVendus))
            .all()
            .map((p: { nbProduitsTotal: number; nbProduitsVendus: number; coutTotal: number; beneficesTotal: number }) => ({
                ...p,
                tauxVente: p.nbProduitsTotal > 0 ? (p.nbProduitsVendus / p.nbProduitsTotal) * 100 : 0,
                ROI: p.coutTotal > 0 ? (p.beneficesTotal / p.coutTotal) * 100 : 0
            }));
    }

    private getTopProduits(db: DrizzleDB, userId: string, startDateStr: string) {
        return db.select({
            id: products.id, nom: products.name, prixAchat: products.price, prixVente: products.sellingPrice,
            benefice: sqlFormulas.benefice,
            plateforme: sql<string>`COALESCE(${products.plateforme}, 'Non spécifié')`,
            dateVente: products.soldAt, dateMiseEnLigne: products.listedAt,
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), gte(products.soldAt, startDateStr)))
            .orderBy(desc(sqlFormulas.benefice))
            .limit(10)
            .all()
            .map((p: { prixVente: number | null; benefice: number; dateMiseEnLigne: string | null; dateVente: string | null }) => ({
                ...p,
                margePercent: (p.prixVente && p.prixVente > 0) ? (p.benefice / p.prixVente) * 100 : 0,
                delaiVente: (p.dateMiseEnLigne && p.dateVente)
                    ? (new Date(p.dateVente).getTime() - new Date(p.dateMiseEnLigne).getTime()) / (1000 * 60 * 60 * 24)
                    : null
            }));
    }

    private getFlopProduits(db: DrizzleDB, userId: string, startDateStr: string) {
        return db.select({
            id: products.id, nom: products.name, prixAchat: products.price, prixVente: products.sellingPrice,
            benefice: sqlFormulas.benefice,
            plateforme: sql<string>`COALESCE(${products.plateforme}, 'Non spécifié')`,
            dateVente: products.soldAt,
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), gte(products.soldAt, startDateStr)))
            .orderBy(asc(sqlFormulas.benefice))
            .limit(10)
            .all()
            .map((p: { prixVente: number | null; benefice: number }) => ({
                ...p, margePercent: (p.prixVente && p.prixVente > 0) ? (p.benefice / p.prixVente) * 100 : 0,
            }));
    }

    private getDelaisVente(db: DrizzleDB, userId: string, startDateStr: string) {
        const delaisData: number[] = db.select({ delai: sql<number>`julianday(${products.soldAt}) - julianday(${products.listedAt})` })
            .from(products)
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), sql`${products.listedAt} IS NOT NULL`, sql`${products.soldAt} IS NOT NULL`, gte(products.soldAt, startDateStr)))
            .all()
            .map((d: { delai: number }) => d.delai);

        return {
            delaiMoyen: delaisData.length > 0 ? delaisData.reduce((a, b) => a + b, 0) / delaisData.length : 0,
            delaiMedian: delaisData.length > 0 ? delaisData.sort((a, b) => a - b)[Math.floor(delaisData.length / 2)] : 0,
            delaiMin: delaisData.length > 0 ? Math.min(...delaisData) : 0,
            delaiMax: delaisData.length > 0 ? Math.max(...delaisData) : 0,
            nbProduitsAvecDelai: delaisData.length
        };
    }

    private getProduitsNonVendus(db: DrizzleDB, userId: string, startDateStr: string) {
        return db.select({
            id: products.id, nom: products.name, prixAchat: products.price,
            coutLivraison: sqlFormulas.coutLivraison,
            dateMiseEnLigne: products.listedAt,
            parcelNumero: sql<string>`COALESCE(${parcels.superbuyId}, 'Non spécifié')`
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), eq(products.vendu, '0'), gte(products.createdAt, startDateStr)))
            .orderBy(asc(products.listedAt))
            .limit(50)
            .all()
            .map((p: { dateMiseEnLigne: string | null }) => ({
                ...p, joursEnLigne: p.dateMiseEnLigne ? (new Date().getTime() - new Date(p.dateMiseEnLigne).getTime()) / (1000 * 60 * 60 * 24) : null
            }));
    }

    private getAnalyseCouts(db: DrizzleDB, userId: string, startDateStr: string) {
        const result = db.select({
            coutAchatTotal: sql<number>`COALESCE(SUM(${products.price}), 0)`,
            coutLivraisonTotal: sql<number>`COALESCE(SUM(${sqlFormulas.coutLivraison}), 0)`,
            coutTotalInvesti: sql<number>`COALESCE(SUM(${sqlFormulas.coutTotal}), 0)`,
            nbParcelles: sql<number>`COUNT(DISTINCT ${products.parcelId})`,
            coutMoyenParProduit: sql<number>`COALESCE(AVG(${products.price}), 0)`,
            coutMoyenLivraison: sql<number>`COALESCE(AVG(${sqlFormulas.coutLivraison}), 0)`
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), gte(products.createdAt, startDateStr)))
            .get();

        return result || { coutAchatTotal: 0, coutLivraisonTotal: 0, coutTotalInvesti: 0, nbParcelles: 0, coutMoyenParProduit: 0, coutMoyenLivraison: 0 };
    }
}

export const advancedStatsService = new AdvancedStatsService();
=======

import { BaseService } from "../base-service";
import { databaseService } from "@/lib/database";
import { products, parcels } from "@/lib/database/schema";
import { eq, and, gte, lt, sql, desc, asc, count } from "drizzle-orm";
import { StatsSearchParams } from "@/lib/schemas/stats";

// Trend calculation utility
export function calculateTrend(current: number, previous: number): number {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}

// Date range calculation
export function getDateRanges(period: string): {
    startDate: Date;
    previousStartDate: Date;
    previousEndDate: Date;
} {
    const now = new Date();
    const startDate = new Date();
    const previousStartDate = new Date();
    const previousEndDate = new Date();

    switch (period) {
        case '7d':
            startDate.setDate(now.getDate() - 7);
            previousStartDate.setDate(now.getDate() - 14);
            previousEndDate.setDate(now.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(now.getDate() - 30);
            previousStartDate.setDate(now.getDate() - 60);
            previousEndDate.setDate(now.getDate() - 30);
            break;
        case '90d':
            startDate.setDate(now.getDate() - 90);
            previousStartDate.setDate(now.getDate() - 180);
            previousEndDate.setDate(now.getDate() - 90);
            break;
        case '1y':
            startDate.setFullYear(now.getFullYear() - 1);
            previousStartDate.setFullYear(now.getFullYear() - 2);
            previousEndDate.setFullYear(now.getFullYear() - 1);
            break;
        case 'all':
        default:
            startDate.setTime(new Date('2000-01-01').getTime());
            previousStartDate.setTime(new Date('1900-01-01').getTime());
            previousEndDate.setTime(new Date('2000-01-01').getTime());
            break;
    }

    return { startDate, previousStartDate, previousEndDate };
}

import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/database/schema";

type DrizzleDB = BetterSQLite3Database<typeof schema>;

export class AdvancedStatsService extends BaseService {
    constructor() {
        super("AdvancedStatsService");
    }

    async getAdvancedStats(userId: string, params: StatsSearchParams) {
        return this.executeOperation("getAdvancedStats", async () => {
            const { period, groupBy } = params;
            const { startDate, previousStartDate, previousEndDate } = getDateRanges(period);

            const startDateStr = startDate.toISOString();
            const previousStartDateStr = previousStartDate.toISOString();
            const previousEndDateStr = previousEndDate.toISOString();

            return await databaseService.executeQuery((db) => {
                const vueEnsemble = this.getVueEnsemble(db, userId, startDateStr);
                const trends = this.calculateTrends(db, userId, vueEnsemble, period, previousStartDateStr, previousEndDateStr);
                const evolutionTemporelle = this.getEvolutionTemporelle(db, userId, groupBy, startDateStr);
                const performancePlateforme = this.getPerformancePlateforme(db, userId, startDateStr);
                const performanceParcel = this.getPerformanceParcel(db, userId, startDateStr);
                const topProduits = this.getTopProduits(db, userId, startDateStr);
                const flopProduits = this.getFlopProduits(db, userId, startDateStr);
                const delaisVente = this.getDelaisVente(db, userId, startDateStr);
                const produitsNonVendus = this.getProduitsNonVendus(db, userId, startDateStr);
                const analyseCouts = this.getAnalyseCouts(db, userId, startDateStr);

                const margeMoyenne = vueEnsemble.chiffreAffaires > 0
                    ? (vueEnsemble.beneficesTotal / vueEnsemble.chiffreAffaires) * 100
                    : 0;

                return {
                    periode: period,
                    groupBy: groupBy,
                    vueEnsemble: {
                        ...vueEnsemble,
                        margeMoyenne,
                        tauxVente: vueEnsemble.totalProduits > 0 ? (vueEnsemble.produitsVendus / vueEnsemble.totalProduits) * 100 : 0,
                        trends
                    },
                    evolutionTemporelle,
                    performancePlateforme,
                    performanceParcelle: performanceParcel,
                    topProduits,
                    flopProduits,
                    delaisVente,
                    produitsNonVendus,
                    analyseCouts,
                    lastUpdate: new Date().toISOString()
                };
            });
        }, { userId, ...params });
    }

    private getVueEnsemble(db: DrizzleDB, userId: string, startDateStr: string) {
        const result = db.select({
            totalProduits: count(),
            produitsVendus: sql<number>`SUM(CASE WHEN ${products.vendu} = '1' THEN 1 ELSE 0 END)`,
            produitsEnLigne: sql<number>`SUM(CASE WHEN ${products.listedAt} IS NOT NULL AND ${products.vendu} = '0' THEN 1 ELSE 0 END)`,
            produitsStock: sql<number>`SUM(CASE WHEN ${products.listedAt} IS NULL AND ${products.vendu} = '0' THEN 1 ELSE 0 END)`,
            chiffreAffaires: sql<number>`COALESCE(SUM(CASE WHEN ${products.vendu} = '1' THEN ${products.sellingPrice} ELSE 0 END), 0)`,
            beneficesTotal: sql<number>`COALESCE(SUM(CASE WHEN ${products.vendu} = '1' THEN(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)) ELSE 0 END), 0)`,
            prixMoyenVente: sql<number>`COALESCE(AVG(CASE WHEN ${products.vendu} = '1' THEN ${products.sellingPrice} END), 0)`,
            prixMoyenAchat: sql<number>`COALESCE(AVG(${products.price}), 0)`,
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), gte(products.createdAt, startDateStr)))
            .get();

        return result || {
            totalProduits: 0, produitsVendus: 0, produitsEnLigne: 0, produitsStock: 0,
            chiffreAffaires: 0, beneficesTotal: 0, prixMoyenVente: 0, prixMoyenAchat: 0
        };
    }

    private calculateTrends(
        db: DrizzleDB, userId: string,
        vueEnsemble: { chiffreAffaires: number; produitsVendus: number; beneficesTotal: number; prixMoyenVente: number; totalProduits: number },
        period: string, previousStartDateStr: string, previousEndDateStr: string
    ) {
        if (period === 'all') {
            return { chiffreAffaires: 0, produitsVendus: 0, margeMoyenne: 0, prixMoyenVente: 0, beneficesTotal: 0, tauxVente: 0 };
        }

        const prevResult = db.select({
            produitsVendus: sql<number>`SUM(CASE WHEN ${products.vendu} = '1' THEN 1 ELSE 0 END)`,
            chiffreAffaires: sql<number>`COALESCE(SUM(CASE WHEN ${products.vendu} = '1' THEN ${products.sellingPrice} ELSE 0 END), 0)`,
            beneficesTotal: sql<number>`COALESCE(SUM(CASE WHEN ${products.vendu} = '1' THEN(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)) ELSE 0 END), 0)`,
            prixMoyenVente: sql<number>`COALESCE(AVG(CASE WHEN ${products.vendu} = '1' THEN ${products.sellingPrice} END), 0)`,
            totalCount: count(),
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), gte(products.createdAt, previousStartDateStr), lt(products.createdAt, previousEndDateStr)))
            .get();

        const margeMoyenne = vueEnsemble.chiffreAffaires > 0 ? (vueEnsemble.beneficesTotal / vueEnsemble.chiffreAffaires) * 100 : 0;
        const prevMargeMoyenne = prevResult?.chiffreAffaires > 0 ? (prevResult.beneficesTotal / prevResult.chiffreAffaires) * 100 : 0;
        const prevTauxVente = prevResult?.totalCount > 0 ? (prevResult.produitsVendus / prevResult.totalCount) * 100 : 0;

        return {
            chiffreAffaires: calculateTrend(vueEnsemble.chiffreAffaires, prevResult?.chiffreAffaires || 0),
            produitsVendus: calculateTrend(vueEnsemble.produitsVendus, prevResult?.produitsVendus || 0),
            margeMoyenne: margeMoyenne - prevMargeMoyenne,
            prixMoyenVente: calculateTrend(vueEnsemble.prixMoyenVente, prevResult?.prixMoyenVente || 0),
            beneficesTotal: calculateTrend(vueEnsemble.beneficesTotal, prevResult?.beneficesTotal || 0),
            tauxVente: ((vueEnsemble.produitsVendus / (vueEnsemble.totalProduits || 1)) * 100) - prevTauxVente
        };
    }

    private getEvolutionTemporelle(db: DrizzleDB, userId: string, groupBy: string, startDateStr: string) {
        let groupByClause, dateFormat;
        switch (groupBy) {
            case 'day':
                groupByClause = sql`DATE(${products.soldAt})`;
                dateFormat = sql`strftime('%Y-%m-%d', ${products.soldAt})`;
                break;
            case 'week':
                groupByClause = sql`strftime('%Y-%W', ${products.soldAt})`;
                dateFormat = sql`strftime('%Y-W%W', ${products.soldAt})`;
                break;
            case 'month':
                groupByClause = sql`strftime('%Y-%m', ${products.soldAt})`;
                dateFormat = sql`strftime('%Y-%m', ${products.soldAt})`;
                break;
        }

        return db.select({
            periode: dateFormat,
            nbVentes: count(),
            chiffreAffaires: sql<number>`COALESCE(SUM(${products.sellingPrice}), 0)`,
            benefices: sql<number>`COALESCE(SUM(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)), 0)`,
            prixMoyenVente: sql<number>`COALESCE(AVG(${products.sellingPrice}), 0)`,
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), sql`${products.soldAt} IS NOT NULL`, gte(products.soldAt, startDateStr)))
            .groupBy(groupByClause)
            .orderBy(asc(dateFormat))
            .all()
            .map((e: { chiffreAffaires: number; benefices: number }) => ({
                ...e,
                margeMoyenne: e.chiffreAffaires > 0 ? (e.benefices / e.chiffreAffaires) * 100 : 0
            }));
    }

    private getPerformancePlateforme(db: DrizzleDB, userId: string, startDateStr: string) {
        const totalVentes = db.select({ count: count() })
            .from(products)
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), gte(products.soldAt, startDateStr)))
            .get()?.count || 0;

        return db.select({
            plateforme: sql<string>`COALESCE(${products.plateforme}, 'Non spécifié')`,
            nbVentes: count(),
            chiffreAffaires: sql<number>`COALESCE(SUM(${products.sellingPrice}), 0)`,
            benefices: sql<number>`COALESCE(SUM(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)), 0)`,
            prixMoyenVente: sql<number>`COALESCE(AVG(${products.sellingPrice}), 0)`,
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), gte(products.soldAt, startDateStr)))
            .groupBy(products.plateforme)
            .orderBy(desc(sql`COALESCE(SUM(${products.sellingPrice}), 0)`))
            .all()
            .map((p: { chiffreAffaires: number; benefices: number; nbVentes: number }) => ({
                ...p,
                margeMoyenne: p.chiffreAffaires > 0 ? (p.benefices / p.chiffreAffaires) * 100 : 0,
                partMarche: totalVentes > 0 ? (p.nbVentes / totalVentes) * 100 : 0
            }));
    }

    private getPerformanceParcel(db: DrizzleDB, userId: string, startDateStr: string) {
        return db.select({
            parcelId: products.parcelId,
            parcelNumero: sql<string>`COALESCE(${parcels.superbuyId}, 'Sans parcelle')`,
            parcelNom: sql<string>`COALESCE(${parcels.name}, '')`,
            nbProduitsTotal: count(),
            nbProduitsVendus: sql<number>`SUM(CASE WHEN ${products.vendu} = '1' THEN 1 ELSE 0 END)`,
            chiffreAffaires: sql<number>`COALESCE(SUM(CASE WHEN ${products.vendu} = '1' THEN ${products.sellingPrice} ELSE 0 END), 0)`,
            coutTotal: sql<number>`COALESCE(SUM(${products.price} + COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)), 0)`,
            beneficesTotal: sql<number>`COALESCE(SUM(CASE WHEN ${products.vendu} = '1' THEN(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)) ELSE 0 END), 0)`,
            prixParGramme: sql<number>`COALESCE(${parcels.pricePerGram}, 0)`,
            poidsTotal: sql<number>`COALESCE(SUM(${products.poids}), 0)`,
            coutLivraisonTotal: sql<number>`COALESCE(SUM(COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)), 0)`,
            trackingNumber: sql<string>`COALESCE(${parcels.trackingNumber}, '')`,
            carrier: sql<string>`COALESCE(${parcels.carrier}, '')`,
            status: sql<string>`COALESCE(${parcels.status}, 'Inconnu')`,
            createdAt: sql<string>`COALESCE(${parcels.createdAt}, datetime('now'))`
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), gte(products.createdAt, startDateStr)))
            .groupBy(products.parcelId)
            .orderBy(desc(sql`COALESCE(SUM(CASE WHEN ${products.vendu} = '1' THEN(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)) ELSE 0 END), 0)`))
            .all()
            .map((p: { nbProduitsTotal: number; nbProduitsVendus: number; coutTotal: number; beneficesTotal: number }) => ({
                ...p,
                tauxVente: p.nbProduitsTotal > 0 ? (p.nbProduitsVendus / p.nbProduitsTotal) * 100 : 0,
                ROI: p.coutTotal > 0 ? (p.beneficesTotal / p.coutTotal) * 100 : 0
            }));
    }

    private getTopProduits(db: DrizzleDB, userId: string, startDateStr: string) {
        return db.select({
            id: products.id, nom: products.name, prixAchat: products.price, prixVente: products.sellingPrice,
            benefice: sql<number>`(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0))`,
            plateforme: sql<string>`COALESCE(${products.plateforme}, 'Non spécifié')`,
            dateVente: products.soldAt, dateMiseEnLigne: products.listedAt,
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), gte(products.soldAt, startDateStr)))
            .orderBy(desc(sql`(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0))`))
            .limit(10)
            .all()
            .map((p: { prixVente: number | null; benefice: number; dateMiseEnLigne: string | null; dateVente: string | null }) => ({
                ...p,
                margePercent: (p.prixVente && p.prixVente > 0) ? (p.benefice / p.prixVente) * 100 : 0,
                delaiVente: (p.dateMiseEnLigne && p.dateVente)
                    ? (new Date(p.dateVente).getTime() - new Date(p.dateMiseEnLigne).getTime()) / (1000 * 60 * 60 * 24)
                    : null
            }));
    }

    private getFlopProduits(db: DrizzleDB, userId: string, startDateStr: string) {
        return db.select({
            id: products.id, nom: products.name, prixAchat: products.price, prixVente: products.sellingPrice,
            benefice: sql<number>`(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0))`,
            plateforme: sql<string>`COALESCE(${products.plateforme}, 'Non spécifié')`,
            dateVente: products.soldAt,
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), gte(products.soldAt, startDateStr)))
            .orderBy(asc(sql`(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0))`))
            .limit(10)
            .all()
            .map((p: { prixVente: number | null; benefice: number }) => ({
                ...p, margePercent: (p.prixVente && p.prixVente > 0) ? (p.benefice / p.prixVente) * 100 : 0,
            }));
    }

    private getDelaisVente(db: DrizzleDB, userId: string, startDateStr: string) {
        const delaisData: number[] = db.select({ delai: sql<number>`julianday(${products.soldAt}) - julianday(${products.listedAt})` })
            .from(products)
            .where(and(eq(products.userId, userId), eq(products.vendu, '1'), sql`${products.listedAt} IS NOT NULL`, sql`${products.soldAt} IS NOT NULL`, gte(products.soldAt, startDateStr)))
            .all()
            .map((d: { delai: number }) => d.delai);

        return {
            delaiMoyen: delaisData.length > 0 ? delaisData.reduce((a, b) => a + b, 0) / delaisData.length : 0,
            delaiMedian: delaisData.length > 0 ? delaisData.sort((a, b) => a - b)[Math.floor(delaisData.length / 2)] : 0,
            delaiMin: delaisData.length > 0 ? Math.min(...delaisData) : 0,
            delaiMax: delaisData.length > 0 ? Math.max(...delaisData) : 0,
            nbProduitsAvecDelai: delaisData.length
        };
    }

    private getProduitsNonVendus(db: DrizzleDB, userId: string, startDateStr: string) {
        return db.select({
            id: products.id, nom: products.name, prixAchat: products.price,
            coutLivraison: sql<number>`COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)`,
            dateMiseEnLigne: products.listedAt,
            parcelNumero: sql<string>`COALESCE(${parcels.superbuyId}, 'Non spécifié')`
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), eq(products.vendu, '0'), gte(products.createdAt, startDateStr)))
            .orderBy(asc(products.listedAt))
            .limit(50)
            .all()
            .map((p: { dateMiseEnLigne: string | null }) => ({
                ...p, joursEnLigne: p.dateMiseEnLigne ? (new Date().getTime() - new Date(p.dateMiseEnLigne).getTime()) / (1000 * 60 * 60 * 24) : null
            }));
    }

    private getAnalyseCouts(db: DrizzleDB, userId: string, startDateStr: string) {
        const result = db.select({
            coutAchatTotal: sql<number>`COALESCE(SUM(${products.price}), 0)`,
            coutLivraisonTotal: sql<number>`COALESCE(SUM(COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)), 0)`,
            coutTotalInvesti: sql<number>`COALESCE(SUM(${products.price} + COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)), 0)`,
            nbParcelles: sql<number>`COUNT(DISTINCT ${products.parcelId})`,
            coutMoyenParProduit: sql<number>`COALESCE(AVG(${products.price}), 0)`,
            coutMoyenLivraison: sql<number>`COALESCE(AVG(COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)), 0)`
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(eq(products.userId, userId), gte(products.createdAt, startDateStr)))
            .get();

        return result || { coutAchatTotal: 0, coutLivraisonTotal: 0, coutTotalInvesti: 0, nbParcelles: 0, coutMoyenParProduit: 0, coutMoyenLivraison: 0 };
    }


}

export const advancedStatsService = new AdvancedStatsService();
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

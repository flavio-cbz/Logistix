import { type Page } from "playwright";
import { type NewSuperbuyParcel } from "@/lib/database/schema";
import { SuperbuyParcel } from "./types";
import { getUsdToEurRate } from "./currency-utils";

/**
 * Parse parcels from the Superbuy parcels page or API response
 * Strategy:
 *  - try to parse the page body as JSON (API response or JSON dump)
 *  - if not JSON, attempt a DOM extraction (useful for server-rendered or CSR pages)
 */
export async function parseParcelsPage(page: Page, userId: string): Promise<NewSuperbuyParcel[]> {
    // 1) Try JSON body
    try {
        const bodyText = await page.innerText('body');
        const cleanText = bodyText.trim();
        if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
            const json = JSON.parse(cleanText);
            return await parseParcelsJson(json, userId);
        }
    } catch (_e) {
        // not JSON, continue to DOM extraction
    }

    // 2) DOM extraction fallback
    try {
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
    } catch (_e) {
        // ignore
    }

    const extractedParcels = await page.evaluate((uid) => {
        const items: {
            userId: string;
            superbuyId: string;
            trackingNumber: string | undefined;
            weight: number;
            status: string;
            carrier: string | undefined;
            createdAt: string;
            updatedAt: string;
        }[] = [];

        const rows = document.querySelectorAll('.parcel-item, tr.parcel-row, .package-list-item, .package-item');
        rows.forEach((row) => {
            try {
                const idEl = row.querySelector('.parcel-no, .package-no');
                const trackingEl = row.querySelector('.tracking-no, .logistics-no, .express-no');
                const weightEl = row.querySelector('.weight');
                const statusEl = row.querySelector('.status, .package-status');
                const carrierEl = row.querySelector('.carrier, .logistics-company, .delivery-company');

                const superbuyId = idEl?.textContent?.trim() || "";
                if (!superbuyId) return;

                const trackingNumber = trackingEl?.textContent?.trim();
                const weightText = weightEl?.textContent?.replace(/[^0-9.]/g, "") || "0";
                const weight = parseFloat(weightText);
                const status = statusEl?.textContent?.trim() || "Pending";
                const carrier = carrierEl?.textContent?.trim();

                items.push({
                    userId: uid,
                    superbuyId,
                    trackingNumber,
                    weight,
                    status,
                    carrier,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            } catch (_e) {

            }
        });

        return items;
    }, userId);

    // If DOM returned something, map it to NewSuperbuyParcel via parseParcelsJson for normalization
    if (Array.isArray(extractedParcels) && extractedParcels.length > 0) {
        // convert to the shape parseParcelsJson would produce
        return extractedParcels.map(p => ({
            userId: p.userId,
            superbuyId: p.superbuyId,
            trackingNumber: p.trackingNumber,
            weight: p.weight,
            status: p.status,
            carrier: p.carrier,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        } as NewSuperbuyParcel));
    }

    return [];
}

export async function parseParcelsJson(data: unknown, userId: string): Promise<NewSuperbuyParcel[]> {
    // Handle the specific structure from page_parcels.json
    // data.data.package.listResult
    let parcelsList: SuperbuyParcel[] = [];
    const typedData = data as {
        data?: { package?: { listResult?: SuperbuyParcel[] } } | SuperbuyParcel[];
        packages?: SuperbuyParcel[];
    };

    if (typedData?.data && 'package' in typedData.data && typedData.data.package?.listResult && Array.isArray(typedData.data.package.listResult)) {
        parcelsList = typedData.data.package.listResult;
    } else if (Array.isArray(data)) {
        parcelsList = data as SuperbuyParcel[];
    } else if (typedData.data && Array.isArray(typedData.data)) {
        parcelsList = typedData.data as SuperbuyParcel[];
    } else if (typedData.packages && Array.isArray(typedData.packages)) {
        parcelsList = typedData.packages;
    }

    const items: NewSuperbuyParcel[] = [];
    const seenIds = new Set<string>();

    for (const parcel of parcelsList) {
        try {
            // Extract packageNo (handle duplicates)
            const superbuyId = String(parcel.packageNo || "");
            if (!superbuyId || seenIds.has(superbuyId)) return [];
            seenIds.add(superbuyId);

            // Extract fields based on user requirements
            const packageInfo = parcel.packageInfo || {};

            // Carrier: deliveryEnName (from root item)
            const carrier = String(parcel.deliveryEnName || packageInfo.deliveryName || "Unknown");

            // Tracking Number: expressNo (from packageInfo)
            const trackingNumber = String(packageInfo.expressNo || parcel.expressNo || "");

            // Status: packageStatusName (from packageInfo)
            const status = String(packageInfo.packageStatusName || parcel.packageStatusName || "Unknown");

            // Weight: packageRealWeight (from packageInfo)
            const weight = parseFloat(String(packageInfo.packageRealWeight || parcel.packageRealWeight || 0));

            // Price: Use packagePrice (preferred) which is expected in USD
            let priceUSD = 0;
            if (packageInfo.packagePrice !== undefined && packageInfo.packagePrice !== '') {
                priceUSD = parseFloat(String(packageInfo.packagePrice));
            } else if (packageInfo.realFreight !== undefined && packageInfo.realFreight !== '') {
                priceUSD = parseFloat(String(packageInfo.realFreight));
            } else if (packageInfo.freight !== undefined && packageInfo.freight !== '') {
                priceUSD = parseFloat(String(packageInfo.freight));
            }

            // Determine USD->EUR rate. Prefer an explicit field if provided (packageInfo.usdToEur or packageInfo.exchangeRateToEur)
            let usdToEur = undefined as number | undefined;
            if (packageInfo.usdToEur) usdToEur = parseFloat(String(packageInfo.usdToEur));
            if (!usdToEur && packageInfo.exchangeRateToEur) usdToEur = parseFloat(String(packageInfo.exchangeRateToEur));

            // If not provided, fetch a live rate (cached)
            if (!usdToEur) {
                usdToEur = await getUsdToEurRate();
            }

            // Basic heuristic: if priceUSD looks 0 or absurdly large, try to recover from realPackagePrice
            let priceEUR = 0;
            const exchangeRateUsed = 0.14; // Default CNY to EUR rate
            const rawReal = packageInfo.realPackagePrice ?? parcel.realPackagePrice ?? packageInfo.realPackagePrice;
            const rawRealNum = rawReal ? parseFloat(String(rawReal)) : 0;

            // If we have a sane USD amount, convert directly
            if (priceUSD && !isNaN(priceUSD)) {
                priceEUR = priceUSD * usdToEur;
            } else if (rawRealNum && rawRealNum > 0) {
                // realPackagePrice in many Superbuy responses is CNY * 100 (i.e. 68300 -> 683.00 CNY)
                // If we also have packageInfo.exchangeRate (likely USD->CNY), use it to derive USD
                const maybeCny = rawRealNum > 1000 ? rawRealNum / 100 : rawRealNum; // heuristic
                let usdToCny = NaN;
                if (parcel.packageInfo?.exchangeRate && Number(parcel.packageInfo.exchangeRate) > 1) {
                    usdToCny = parseFloat(String(parcel.packageInfo.exchangeRate));
                }
                let derivedUsd = NaN;
                if (usdToCny && !isNaN(usdToCny) && usdToCny > 1) {
                    derivedUsd = maybeCny / usdToCny;
                } else {
                    // fallback assume ~7 CNY per USD
                    derivedUsd = maybeCny / 7;
                }
                if (!isNaN(derivedUsd)) {
                    priceUSD = derivedUsd;
                    priceEUR = priceUSD * usdToEur;
                }
            }

            // Guardrail: if computed EUR is absurdly large, log and set to 0 to avoid poisoning DB
            if (priceEUR > 100000) {

                priceEUR = 0;
            }

            items.push({
                userId: userId,
                superbuyId,
                trackingNumber,
                weight,
                status, // Will be mapped in automation.ts
                carrier,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });


            // Attach the price and metadata for use in syncParcelsToLegacy
            const last = items[items.length - 1] as unknown as Record<string, unknown>;
            last['priceEUR'] = Number(priceEUR.toFixed(4));
            last['priceUSD'] = Number((priceUSD || 0).toFixed(4));
            last['exchangeRateUsed'] = Number((exchangeRateUsed || 0).toFixed(6));
            last['priceSource'] = priceUSD ? 'packagePrice' : (rawRealNum ? 'realPackagePrice_derived' : 'unknown');

        } catch (_e) {

        }
    }

    return items;
}

<<<<<<< HEAD
import { ParsedSuperbuyProduct } from "@/lib/shared/types/superbuy";
import { SuperbuyParcel } from "./types";
import { getUsdToEurRate } from "./currency-utils";
import { safeFloat, safeInt, safeString, safeJsonParse } from "./utils";

/**
 * Parse products from parcels response (orderItems within each parcel)
 * Returns products with their parcel association
 */
export async function parseProductsFromParcels(data: unknown, userId: string): Promise<ParsedSuperbuyProduct[]> {
    let parcelsList: SuperbuyParcel[] = [];

    const typedData = data as { data?: { package?: { listResult?: SuperbuyParcel[] } } };

    if (typedData?.data?.package?.listResult && Array.isArray(typedData.data.package.listResult)) {
        parcelsList = typedData.data.package.listResult;
    } else if (Array.isArray(data)) {
        parcelsList = data as SuperbuyParcel[];
    }

    const products: ParsedSuperbuyProduct[] = [];
    const usdToEur = await getUsdToEurRate();

    for (const parcel of parcelsList) {
        const packageNo = safeString(parcel.packageNo);
        if (!packageNo) continue;

        const orderItems = parcel.orderItems || [];
        const packageInfo = parcel.packageInfo || {};

        for (const item of orderItems) {
            try {
                const count = safeInt(item.count, 1);
                const unitPrice = safeFloat(item.unitPrice);

                // Determine currency for this item if possible, otherwise use parcel currency
                // Note: item.unitPrice is just a number.

                // Conversion logic
                let priceUSD = 0;
                let priceEUR = 0;

                const parcelAny = parcel as Record<string, unknown>;
                const packageInfoAny = packageInfo as Record<string, unknown>;
                const parcelCurrency = safeString(parcelAny['currency'] || packageInfoAny['currency'] || 'USD');
                const exchangeRate = safeFloat(packageInfo.exchangeRate);

                if (exchangeRate > 1.5) {
                    // Assume unitPrice is CNY and exchangeRate is USD->CNY
                    priceUSD = unitPrice / exchangeRate;
                } else if (parcelCurrency === 'CNY' || parcelCurrency === 'RMB') {
                    // Fallback if exchangeRate is missing but currency says CNY
                    const usdToCny = 7.2;
                    priceUSD = unitPrice / usdToCny;
                } else {
                    // Assume USD
                    priceUSD = unitPrice;
                }

                priceEUR = priceUSD * usdToEur;

                // Extract ALL photos from arrivalPicList (QC photos)
                let photoUrls: string[] = [];
                if (Array.isArray(item.arrivalPicList) && item.arrivalPicList.length > 0) {
                    photoUrls = item.arrivalPicList.map((url: unknown) => safeString(url)).filter(Boolean);
                } else if (item.arrivalPic) {
                    // arrivalPic might be a JSON string
                    const arrivalPicStr = safeString(item.arrivalPic);
                    if (arrivalPicStr.startsWith('[') || arrivalPicStr.startsWith('{')) {
                        const parsed = safeJsonParse<string[]>(arrivalPicStr);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            photoUrls = parsed.map((url: unknown) => safeString(url)).filter(Boolean);
                        }
                    }
                    // Fallback: treat as Single URL string if not parsed array
                    if (photoUrls.length === 0 && arrivalPicStr) {
                        photoUrls = [arrivalPicStr];
                    }
                }

                // Also check for goodsPic as fallback
                if (photoUrls.length === 0 && item.goodsPic) {
                    photoUrls = [safeString(item.goodsPic)];
                }
                if (photoUrls.length === 0 && item.picUrl) {
                    photoUrls = [safeString(item.picUrl)];
                }

                const photoUrl = photoUrls.length > 0 ? photoUrls[0] : '';

                const productData = {
                    userId,
                    name: safeString(item.itemBarcode || item.goodsCode || 'Unknown'),
                    brand: safeString(item.goodsName),
                    category: 'Autre', // Constant as per user request
                    subcategory: safeString(item.itemRemark),
                    photoUrl,
                    photoUrls, // All QC photos
                    price: Number(priceEUR.toFixed(4)),
                    priceUSD: Number(priceUSD.toFixed(4)),
                    exchangeRateUsed: Number(usdToEur.toFixed(6)),
                    poids: safeFloat(item.weight),
                    parcelleId: packageNo, // Link to parcel
                    status: 'available' as const,
                    externalId: safeString(item.itemBarcode || item.itemId?.toString()),
                    url: safeString(item.goodsLink),
                    currency: 'EUR',
                    plateforme: 'autre' as const,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    // Superbuy metadata for AI enrichment (description and specs from seller)
                    superbuyMetadata: {
                        goodsName: safeString(item.goodsName),
                        itemRemark: safeString(item.itemRemark),
                    },
                };

                // Add product 'count' times
                for (let i = 0; i < count; i++) {
                    products.push({ ...productData });
                }
            } catch (_e) {

            }
        }
    }

    return products;
}
=======
import { ParsedSuperbuyProduct } from "@/lib/shared/types/superbuy";
import { SuperbuyParcel } from "./types";
import { getUsdToEurRate } from "./currency-utils";

/**
 * Parse products from parcels response (orderItems within each parcel)
 * Returns products with their parcel association
 */
export async function parseProductsFromParcels(data: unknown, userId: string): Promise<ParsedSuperbuyProduct[]> {
    let parcelsList: SuperbuyParcel[] = [];

    const typedData = data as { data?: { package?: { listResult?: SuperbuyParcel[] } } };

    if (typedData?.data?.package?.listResult && Array.isArray(typedData.data.package.listResult)) {
        parcelsList = typedData.data.package.listResult;
    } else if (Array.isArray(data)) {
        parcelsList = data as SuperbuyParcel[];
    }

    const products: ParsedSuperbuyProduct[] = [];
    const usdToEur = await getUsdToEurRate();

    for (const parcel of parcelsList) {
        const packageNo = String(parcel.packageNo || "");
        if (!packageNo) continue;

        const orderItems = parcel.orderItems || [];
        const packageInfo = parcel.packageInfo || {};

        for (const item of orderItems) {
            try {
                const count = parseInt(String(item.count || 1));
                const unitPrice = parseFloat(String(item.unitPrice || 0));

                // Determine currency for this item if possible, otherwise use parcel currency
                // Note: item.unitPrice is just a number.

                // Conversion logic
                let priceUSD = 0;
                let priceEUR = 0;

                const parcelAny = parcel as Record<string, unknown>;
                const packageInfoAny = packageInfo as Record<string, unknown>;
                const parcelCurrency = (parcelAny['currency'] as string) || (packageInfoAny['currency'] as string) || 'USD';
                let exchangeRate = 0;
                if (packageInfo.exchangeRate) {
                    exchangeRate = parseFloat(String(packageInfo.exchangeRate));
                }

                if (exchangeRate > 1.5) {
                    // Assume unitPrice is CNY and exchangeRate is USD->CNY
                    priceUSD = unitPrice / exchangeRate;
                } else if (parcelCurrency === 'CNY' || parcelCurrency === 'RMB') {
                    // Fallback if exchangeRate is missing but currency says CNY
                    const usdToCny = 7.2;
                    priceUSD = unitPrice / usdToCny;
                } else {
                    // Assume USD
                    priceUSD = unitPrice;
                }

                priceEUR = priceUSD * usdToEur;

                // Extract ALL photos from arrivalPicList (QC photos)
                let photoUrls: string[] = [];
                if (Array.isArray(item.arrivalPicList) && item.arrivalPicList.length > 0) {
                    photoUrls = item.arrivalPicList.map((url: unknown) => String(url)).filter(Boolean);
                } else if (item.arrivalPic) {
                    // arrivalPic might be a JSON string
                    try {
                        const parsed = JSON.parse(String(item.arrivalPic));
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            photoUrls = parsed.map((url: unknown) => String(url)).filter(Boolean);
                        }
                    } catch {
                        // Single URL as string
                        if (item.arrivalPic) {
                            photoUrls = [String(item.arrivalPic)];
                        }
                    }
                }

                // Also check for goodsPic as fallback
                if (photoUrls.length === 0 && item.goodsPic) {
                    photoUrls = [String(item.goodsPic)];
                }
                if (photoUrls.length === 0 && item.picUrl) {
                    photoUrls = [String(item.picUrl)];
                }

                const photoUrl = photoUrls.length > 0 ? photoUrls[0] : '';

                const productData = {
                    userId,
                    name: String(item.itemBarcode || item.goodsCode || 'Unknown'),
                    brand: String(item.goodsName || ''),
                    category: 'Autre', // Constant as per user request
                    subcategory: String(item.itemRemark || ''),
                    photoUrl,
                    photoUrls, // All QC photos
                    price: Number(priceEUR.toFixed(4)),
                    priceUSD: Number(priceUSD.toFixed(4)),
                    exchangeRateUsed: Number(usdToEur.toFixed(6)),
                    poids: parseFloat(String(item.weight || 0)),
                    parcelleId: packageNo, // Link to parcel
                    status: 'available' as const,
                    externalId: String(item.itemBarcode || item.itemId?.toString()),
                    url: String(item.goodsLink || ''),
                    currency: 'EUR',
                    plateforme: 'autre' as const,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    // Superbuy metadata for AI enrichment (description and specs from seller)
                    superbuyMetadata: {
                        goodsName: String(item.goodsName || ''),
                        itemRemark: String(item.itemRemark || ''),
                    },
                };

                // Add product 'count' times
                for (let i = 0; i < count; i++) {
                    products.push({ ...productData });
                }
            } catch (_e) {

            }
        }
    }

    return products;
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

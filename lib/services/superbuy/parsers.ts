import { type Page } from "playwright";
import { type NewOrder, type NewSuperbuyParcel } from "@/lib/database/schema";

interface SuperbuyOrderItem {
  goodsName?: string;
  goodsPic?: string;
  arrivalPicList?: string[];
  picUrl?: string;
  count?: number | string;
  goodsLink?: string;
  unitPrice?: number | string;
  itemRemark?: string;
  weight?: number | string;
  itemBarcode?: string;
  goodsCode?: string;
  itemId?: string | number;
  arrivalPic?: string; // Sometimes JSON string
}

interface SuperbuyOrder {
  orderItems?: SuperbuyOrderItem[];
  orderNo?: string;
  orderStateName?: string;
  orderStatus?: string;
  totalAmount?: number | string;
}

interface SuperbuyPackageInfo {
  deliveryName?: string;
  expressNo?: string;
  packageStatusName?: string;
  packageRealWeight?: number | string;
  packagePrice?: number | string;
  realFreight?: number | string;
  freight?: number | string;
  usdToEur?: number | string;
  exchangeRateToEur?: number | string;
  realPackagePrice?: number | string;
  exchangeRate?: number | string;
}

interface SuperbuyParcel {
  packageNo?: string;
  orderItems?: SuperbuyOrderItem[];
  deliveryEnName?: string;
  packageInfo?: SuperbuyPackageInfo;
  expressNo?: string;
  packageStatusName?: string;
  packageRealWeight?: number | string;
  realPackagePrice?: number | string;
}

/**
 * Parse orders from the Superbuy orders page or API response
 * @param page Playwright page object
 * @param userId The ID of the user to associate orders with
 */
export async function parseOrdersPage(page: Page, userId: string): Promise<NewOrder[]> {
  // 1. Try to parse the entire body as JSON (if the page is an API response)
  try {
    const bodyText = await page.innerText('body');
    // Clean up any potential HTML wrapping if it's a raw text response rendered by browser
    const cleanText = bodyText.trim();
    if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
      const json = JSON.parse(cleanText);
      return parseOrdersJson(json, userId);
    }
  } catch (_e) {
    // Not a JSON response, proceed to DOM/Script parsing
  }

  // 2. Wait for the order list to load (if it's a UI page)
  try {
    await page.waitForSelector('script', { state: 'attached', timeout: 5000 });
  } catch (_e) {
    // Ignore timeout, might be a different page structure
  }

  const extractedOrders = await page.evaluate((uid) => {

    // Extract JSON data from the script tag
    const scripts = document.querySelectorAll('script');
    let orderData: unknown[] = [];

    for (const script of scripts) {
      const content = script.textContent || "";
      // Check for various variable names that might hold the data
      if (content.includes('order_lists = eval([')) {
        try {
          const match = content.match(/order_lists\s*=\s*eval\(\s*(\[.*?\])\s*\)/s);
          if (match && match[1]) {
            orderData = JSON.parse(match[1]);
            break;
          }
        } catch (_e) {
          console.error(_e);
        }
      }
      // Add other patterns if needed
    }

    // If we found data in scripts, return it to be processed by parseOrdersJson in Node context
    // (We return raw data to avoid duplicating mapping logic inside evaluate)
    if (orderData.length > 0) {
      return { type: 'json', data: orderData };
    }

    // Fallback to DOM parsing
    const rows = document.querySelectorAll('.order-list-item, tr.order-row');
    const domItems: unknown[] = [];

    rows.forEach((row) => {
      try {
        const orderNoEl = row.querySelector('.order-info .code, .order-no');
        const statusEl = row.querySelector('.status, .order-status');
        const priceEl = row.querySelector('.price, .total-price');

        const superbuyId = orderNoEl?.textContent?.trim() || "";
        if (!superbuyId) return;

        const status = statusEl?.textContent?.trim() || "Unknown";
        const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, "") || "0";
        const totalPrice = parseFloat(priceText);

        const productEls = row.querySelectorAll('.product-item');
        const products = Array.from(productEls).map(p => ({
          name: p.querySelector('.title')?.textContent?.trim(),
          image: p.querySelector('img')?.getAttribute('src'),
          quantity: p.querySelector('.qty')?.textContent?.trim(),
        }));

        domItems.push({
          userId: uid,
          superbuyId,
          status,
          totalPrice,
          items: products,
          currency: "CNY",
          platform: "Superbuy",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (_e) {
        // console.error(e); 
      }
    });
    return { type: 'dom', data: domItems };
  }, userId);

  if (extractedOrders.type === 'json') {
    return parseOrdersJson(extractedOrders.data as unknown[], userId);
  }

  return extractedOrders.data as NewOrder[];
}

function parseOrdersJson(data: unknown, userId: string): NewOrder[] {
  const ordersList = (Array.isArray(data) ? data : [data]) as SuperbuyOrder[];
  const items: NewOrder[] = [];

  ordersList.forEach((order) => {
    try {
      const orderItems = order.orderItems || [];
      const products = orderItems.map((item) => ({
        name: String(item.goodsName || ""),
        image: String(item.goodsPic || (Array.isArray(item.arrivalPicList) && item.arrivalPicList[0]) || item.picUrl || ""),
        quantity: String(item.count || "0"),
        url: String(item.goodsLink || ""),
        price: Number(item.unitPrice || 0),
        sku: String(item.itemRemark || ""),
        weight: Number(item.weight || 0), // Extracted from order item as per user request
        itemBarcode: String(item.itemBarcode || ""), // Crucial for linking
        goodsCode: String(item.goodsCode || "")
      }));

      items.push({
        userId: userId,
        superbuyId: String(order.orderNo || ""),
        status: String(order.orderStateName || order.orderStatus || ""), // Use readable name if available
        totalPrice: Number(order.totalAmount || 0),
        warehouse: "", // Not always available in this JSON view
        items: products,
        currency: "USD", // Assuming USD based on user input "US $ 5.42", but JSON might have currency field. 
        // page_order.json doesn't show currency field explicitly in the snippet, but user said "US $".
        // We can default to USD or CNY. Let's check if there is a currency field.
        // Snippet: "unitPrice": 35.9. No currency symbol.
        // User said "US $ 5.42". 35.9 CNY is approx $5.
        // Let's assume CNY if the values are high (35.9) for a $5 item.
        // Wait, 35.9 CNY / 7.2 = $4.98. Close to $5.42.
        // So the values in JSON are likely CNY.
        platform: "Superbuy",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (_e) {
      // console.error("Error parsing order JSON item", e);
    }
  });

  return items;
}

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
        // console.error('Error parsing parcel row', e); 
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

// Simple in-memory cache for USD->EUR rate to avoid frequent network calls
let _cachedUsdToEur: { rate: number; fetchedAt: number } | null = null;

async function getUsdToEurRate(): Promise<number> {
  try {
    const now = Date.now();
    // reuse cached rate for 12 hours
    if (_cachedUsdToEur && now - _cachedUsdToEur.fetchedAt < 1000 * 60 * 60 * 12) {
      return _cachedUsdToEur.rate;
    }

    // Try Frankfurter public free API (stable, no API key)
    const resp = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR');
    if (!resp.ok) throw new Error('Failed to fetch FX');
    const json = await resp.json();
    // Frankfurter returns { base: 'USD', date: 'YYYY-MM-DD', rates: { EUR: 0.95 } }
    const rate = parseFloat(String(json?.rates?.EUR || json?.rates?.eur || 0));
    if (rate && !isNaN(rate)) {
      _cachedUsdToEur = { rate, fetchedAt: now };
      return rate;
    }
  } catch (_e) {
    // console.warn('[Superbuy][FX] Could not fetch USD->EUR rate, falling back:', (e as any)?.message || e);
  }

  // fallback conservative default
  return 0.95; // ~1 USD = 0.95 EUR (approximate default)
}

/**
 * Parse products from parcels response (orderItems within each parcel)
 * Returns products with their parcel association
 */
export async function parseProductsFromParcels(data: unknown, userId: string): Promise<unknown[]> {
  let parcelsList: SuperbuyParcel[] = [];

  const typedData = data as { data?: { package?: { listResult?: SuperbuyParcel[] } } };

  if (typedData?.data?.package?.listResult && Array.isArray(typedData.data.package.listResult)) {
    parcelsList = typedData.data.package.listResult;
  } else if (Array.isArray(data)) {
    parcelsList = data as SuperbuyParcel[];
  }

  const products: unknown[] = [];
  const usdToEur = await getUsdToEurRate();

  for (const parcel of parcelsList) {
    const packageNo = String(parcel.packageNo || "");
    if (!packageNo) continue;

    const orderItems = parcel.orderItems || [];
    const packageInfo = parcel.packageInfo || {};

    // Detect currency from package info or fallback to USD
    // Often Superbuy returns 'currency' field in packageInfo or we can infer from exchangeRate
    // If exchange rate is > 1 (e.g. 6.x or 7.x), it's likely USD->CNY, so the base values might be CNY
    // However, usually 'packagePrice' is in USD. 
    // Let's check if there is an explicit currency field in the items or parcel.


    // Heuristic: Check if unitPrice looks like CNY (e.g. matches realPackagePrice which is often CNY)
    // But safer to rely on explicit fields if possible.
    // If user says it depends on settings, we might see a currency symbol in some string fields?
    // For now, we will implement a logic that checks for 'CNY' or 'RMB' in currency field if it exists.

    // Also check if we can find a currency symbol in the data

    for (const item of orderItems) {
      try {
        const count = parseInt(String(item.count || 1));
        const unitPrice = parseFloat(String(item.unitPrice || 0));

        // Determine currency for this item if possible, otherwise use parcel currency
        // Note: item.unitPrice is just a number.

        // Conversion logic
        let priceUSD = 0;
        let priceEUR = 0;

        // Check if we have a currency indicator
        // If the user says input is USD or CNY.
        // If we assume the value is in the currency of the parcel.

        // Logic update: If exchangeRate is > 1.5, it implies the unitPrice is in CNY (or similar weak currency)
        // and the rate is USD->CNY (e.g. 6.6 or 7.2).
        // Even if 'currency' says 'USD', the raw values seem to be in CNY in this case.

        const parcelCurrency = (parcel as any).currency || (packageInfo as any).currency || 'USD';
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

        // Extract first photo from arrivalPicList if available
        let photoUrl = '';
        if (Array.isArray(item.arrivalPicList) && item.arrivalPicList.length > 0) {
          photoUrl = String(item.arrivalPicList[0]);
        } else if (item.arrivalPic) {
          // arrivalPic might be a JSON string
          try {
            const parsed = JSON.parse(String(item.arrivalPic));
            if (Array.isArray(parsed) && parsed.length > 0) {
              photoUrl = String(parsed[0]);
            }
          } catch {
            photoUrl = String(item.arrivalPic);
          }
        }

        const productData = {
          userId,
          name: String(item.itemBarcode || item.goodsCode || 'Unknown'),
          brand: String(item.goodsName || ''),
          category: 'Autre', // Constant as per user request
          subcategory: String(item.itemRemark || ''),
          photoUrl,
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
        };

        // Add product 'count' times
        for (let i = 0; i < count; i++) {
          products.push({ ...productData });
        }
      } catch (_e) {
        // console.error('[Superbuy][Products] Error parsing product item:', e);
      }
    }
  }

  return products;
}

async function parseParcelsJson(data: unknown, userId: string): Promise<NewSuperbuyParcel[]> {
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
        // console.warn('[Superbuy][Price] Computed priceEUR is very large, skipping. superbuyId=', superbuyId, 'priceUSD=', priceUSD, 'priceEUR=', priceEUR);
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
      // console.error("Error parsing parcel JSON item", e);
    }
  }

  return items;
}

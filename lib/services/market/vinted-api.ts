import { getLogger } from "@/lib/utils/logging/logger";
import { chromium } from "playwright";

const logger = getLogger("VintedAPI");

export interface VintedSearchParams {
    searchText?: string;
    brandId?: number;
    catalogId?: number; // category
    colorId?: number;
    statusIds?: number[]; // condition
    priceFrom?: number;
    priceTo?: number;
    limit?: number;
}

export interface VintedItem {
    id: number;
    title: string;
    price: {
        amount: string;
        currency_code: string;
    };
    brand_title: string;
    size_title: string;
    status: string;
    url: string;
    photo: {
        url: string;
    };
    favourite_count: number;
    view_count: number;
}

export class VintedAPI {
    private baseUrl = "https://www.vinted.fr";
    // We don't need hardcoded user agent, Playwright handles it or we set it in context.

    /**
     * Search for items on Vinted
     * Uses Playwright to handle cookies and basic bot protection.
     */
    async searchItems(params: VintedSearchParams): Promise<VintedItem[]> {
        const queryParams = new URLSearchParams();

        if (params.searchText) queryParams.append("search_text", params.searchText);
        if (params.brandId) queryParams.append("brand_ids[]", params.brandId.toString());
        if (params.catalogId) queryParams.append("catalog_ids[]", params.catalogId.toString());
        if (params.limit) queryParams.append("per_page", params.limit.toString());

        queryParams.append("order", "newest_first");

        const targetUrl = `${this.baseUrl}/api/v2/catalog/items?${queryParams.toString()}`;

        logger.debug(`Fetching Vinted data via Playwright: ${targetUrl}`);

        let browser = null;
        try {
            browser = await chromium.launch({
                headless: true
            });

            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            const page = await context.newPage();

            // 1. Visit homepage to establish session/cookies
            // We set a short timeout to fail fast if it hangs
            await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

            // Optional: Accept cookies if a modal blocks navigation (less critical for API calls usually, but good practice)
            // But since we go straight to API URL next provided we keep context, it should be fine.

            // 2. Fetch the API data
            const response = await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });

            if (!response) {
                throw new Error("No response from Vinted API");
            }

            if (response.status() === 401 || response.status() === 403) {
                throw new Error(`Vinted API Access Denied (Auth/Bot detection): ${response.status()}`);
            }

            if (!response.ok()) {
                throw new Error(`Vinted API Error: ${response.status()} ${response.statusText()}`);
            }

            // 3. Parse JSON
            const data = await response.json();
            return data.items || [];

        } catch (error) {
            logger.error("Failed to search Vinted items (Playwright)", { error });
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}

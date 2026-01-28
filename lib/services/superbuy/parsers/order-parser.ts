import { type Page } from "playwright";
import { type NewOrder, type OrderItem } from "@/lib/database/schema";
import { SuperbuyOrder } from "./types";
import { safeFloat, safeInt, safeString } from "./utils";
import { SUPERBUY_SELECTORS } from "../constants";

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

    // Pass selectors to evaluate context
    const selectors = SUPERBUY_SELECTORS.ORDERS;

    const extractedOrders = await page.evaluate(({ uid, sel }) => {

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
        const rows = document.querySelectorAll(sel.LIST_ITEMS);
        const domItems: unknown[] = [];

        rows.forEach((row) => {
            try {
                const orderNoEl = row.querySelector(sel.ID);
                const statusEl = row.querySelector(sel.STATUS);
                const priceEl = row.querySelector(sel.PRICE);

                const superbuyId = orderNoEl?.textContent?.trim() || "";
                if (!superbuyId) return;

                const status = statusEl?.textContent?.trim() || "Unknown";
                const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, "") || "0";
                const totalPrice = parseFloat(priceText);

                const productEls = row.querySelectorAll(sel.PRODUCT_ITEM);
                const products: OrderItem[] = Array.from(productEls).map(p => ({
                    name: p.querySelector(sel.PRODUCT_TITLE)?.textContent?.trim() || "Unknown",
                    snapshotUrl: p.querySelector('img')?.getAttribute('src') || "",
                    quantity: parseInt(p.querySelector(sel.PRODUCT_QTY)?.textContent?.trim() || "0"),
                    price: 0, // Not available in this view easily per item, total is on row
                    currency: "CNY",
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

            }
        });
        return { type: 'dom', data: domItems };
    }, { uid: userId, sel: selectors });

    if (extractedOrders.type === 'json') {
        return parseOrdersJson(extractedOrders.data as unknown[], userId);
    }

    return extractedOrders.data as NewOrder[];
}

export function parseOrdersJson(data: unknown, userId: string): NewOrder[] {
    const ordersList = (Array.isArray(data) ? data : [data]) as SuperbuyOrder[];
    const items: NewOrder[] = [];

    ordersList.forEach((order) => {
        try {
            const orderItems = order.orderItems || [];
            const products: OrderItem[] = orderItems.map((item) => ({
                name: safeString(item.goodsName),
                snapshotUrl: safeString(item.goodsPic || (Array.isArray(item.arrivalPicList) && item.arrivalPicList[0]) || item.picUrl),
                quantity: safeInt(item.count),
                url: safeString(item.goodsLink),
                price: safeFloat(item.unitPrice),
                currency: "CNY", // Default to CNY as per heuristic
                remark: safeString(item.itemRemark),
                weight: safeFloat(item.weight),
                itemBarcode: safeString(item.itemBarcode),
                goodsCode: safeString(item.goodsCode)
            }));

            items.push({
                userId: userId,
                superbuyId: safeString(order.orderNo),
                status: safeString(order.orderStateName || order.orderStatus), // Use readable name if available
                totalPrice: safeFloat(order.totalAmount),
                warehouse: "", // Not always available in this JSON view
                items: products,
                currency: "USD",
                platform: "Superbuy",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        } catch (_e) {

        }
    });

    return items;
}

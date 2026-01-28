
export interface VintedItem {
    id: number;
    title: string;
    price: {
        amount: string;
        currency_code: string;
    };
    brand_title: string;
    size_title: string;
    status: string; // e.g. "Très bon état"
    url: string;
    photo: {
        url: string;
    };
    favourite_count: number;
    view_count: number;
    created_at_ts?: number; // timestamp if available
    updated_at_ts?: number;
}

export interface MarketStatsResult {
    totalItems: number;
    price: {
        min: number;
        max: number;
        average: number;
        median: number;
    };
    velocity: {
        avgDaysToSell: number | null; // Null if we can't determine sold date
        turnoverRate: string; // e.g. "High", "Medium", "Low" based on recent vs old items
    };
    samples: VintedItem[];
}

export class MarketStatsCalculator {
    calculate(items: VintedItem[]): MarketStatsResult {
        // Filter out items with no price
        const validItems = items.filter(i => i.price && i.price.amount);

        if (validItems.length === 0) {
            return {
                totalItems: 0,
                price: { min: 0, max: 0, average: 0, median: 0 },
                velocity: { avgDaysToSell: null, turnoverRate: 'Unknown' },
                samples: []
            };
        }

        const prices = validItems
            .map(i => parseFloat(i.price.amount))
            .sort((a, b) => a - b);

        const sum = prices.reduce((a, b) => a + b, 0);
        const avg = sum / prices.length;
        const median = prices[Math.floor(prices.length / 2)];

        // Simple velocity estimation based on creation dates if available
        // This is heuristic: if many items are "new" (created recently), market is active.
        const turnoverRate = 'Unknown';
        // Logic to be refined based on actual data structure

        return {
            totalItems: validItems.length,
            price: {
                min: prices[0] ?? 0,
                max: prices[prices.length - 1] ?? 0,
                average: parseFloat(avg.toFixed(2)),
                median: parseFloat((median ?? 0).toFixed(2)),
            },
            velocity: {
                avgDaysToSell: null, // Hard to get without "sold" date
                turnoverRate
            },
            samples: validItems.slice(0, 5) // Return top 5 as samples
        };
    }
}

export const marketStatsCalculator = new MarketStatsCalculator();

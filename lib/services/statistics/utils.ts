
/**
 * Utility functions for statistics calculations
 */

/**
 * Calculates the percentage trend between a current and previous value.
 * Returns 100 if previous is 0 and current > 0.
 * Returns 0 if previous is 0 and current is <= 0.
 */
export function calculateTrend(current: number, previous: number): number {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}

/**
 * Calculates date ranges for comparison based on a selected period.
 */
export function getDateRanges(period: string): {
    startDate: Date;
    previousStartDate: Date;
    previousEndDate: Date;
} {
    const now = new Date();
    const startDate = new Date();
    const previousStartDate = new Date();
    const previousEndDate = new Date();

    // Reset time components to ensure consistent comparisons if needed,
    // but usually for 'start date' logic we want the exact time or start of day.
    // The original logic just manipulated the date part.

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

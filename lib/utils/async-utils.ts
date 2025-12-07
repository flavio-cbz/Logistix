/**
 * Async utility functions
 */

/**
 * Delays execution for specified milliseconds
 * @param ms - Number of milliseconds to wait
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

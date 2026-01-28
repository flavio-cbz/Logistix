<<<<<<< HEAD
/**
 * Rate limiting utilities for parallel processing with controlled concurrency.
 */

/**
 * Execute async tasks in parallel with rate limiting.
 * 
 * @param tasks - Array of async functions to execute
 * @param options - Rate limiting options
 * @returns Array of results (or errors) in the same order as tasks
 */
export async function parallelWithRateLimit<T>(
    tasks: (() => Promise<T>)[],
    options: {
        /** Maximum number of concurrent executions (default: 3) */
        maxConcurrent?: number;
        /** Delay in ms between starting each task (default: 500) */
        delayBetweenMs?: number;
        /** Whether to continue on individual task errors (default: true) */
        continueOnError?: boolean;
        /** Abort signal to cancel remaining tasks */
        abortSignal?: { aborted: boolean };
    } = {}
): Promise<{ results: (T | null)[]; errors: (Error | null)[]; aborted: boolean }> {
    const {
        maxConcurrent = 3,
        delayBetweenMs = 500,
        continueOnError = true,
        abortSignal,
    } = options;

    const results: (T | null)[] = new Array(tasks.length).fill(null);
    const errors: (Error | null)[] = new Array(tasks.length).fill(null);

    let activeCount = 0;
    let nextIndex = 0;
    let wasAborted = false;


    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const executeTask = async (index: number): Promise<void> => {
        try {
            // Check abort before executing
            if (abortSignal?.aborted) {
                wasAborted = true;
                return;
            }

            const task = tasks[index];
            if (task) {
                results[index] = await task();
            }
        } catch (error) {
            errors[index] = error instanceof Error ? error : new Error(String(error));

            // Check for JOB_CANCELLED - this should abort all tasks
            if (error instanceof Error && error.message === 'JOB_CANCELLED') {
                if (abortSignal) abortSignal.aborted = true;
                wasAborted = true;
            }

            if (!continueOnError) {
                throw errors[index];
            }
        } finally {
            activeCount--;
        }
    };

    // Process all tasks with rate limiting
    const runningTasks: Promise<void>[] = [];

    while (nextIndex < tasks.length) {
        // Check abort signal before starting new tasks
        if (abortSignal?.aborted || wasAborted) {
            break;
        }

        // Wait while at max concurrency
        while (activeCount >= maxConcurrent) {
            if (abortSignal?.aborted || wasAborted) break;
            await delay(50); // Small poll interval
        }

        // Check again after waiting
        if (abortSignal?.aborted || wasAborted) break;

        // Start next task
        activeCount++;
        const taskIndex = nextIndex++;
        runningTasks.push(executeTask(taskIndex));

        // Add delay before next task starts (for rate limiting)
        if (nextIndex < tasks.length && delayBetweenMs > 0) {
            await delay(delayBetweenMs);
        }
    }

    // Wait for all started tasks to complete
    await Promise.all(runningTasks);

    return { results, errors, aborted: wasAborted };
}


/**
 * Process items in batches with a delay between batches.
 * Useful for bulk operations where API has per-second limits.
 */
export async function batchProcess<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: {
        batchSize?: number;
        delayBetweenBatchesMs?: number;
    } = {}
): Promise<{ results: R[]; errors: Array<{ index: number; error: Error }> }> {
    const { batchSize = 5, delayBetweenBatchesMs = 1000 } = options;

    const results: R[] = [];
    const errors: Array<{ index: number; error: Error }> = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
            batch.map((item, batchIndex) => processor(item, i + batchIndex))
        );

        for (let j = 0; j < batchResults.length; j++) {
            const result = batchResults[j];
            if (!result) continue;

            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                errors.push({
                    index: i + j,
                    error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
                });
            }
        }

        // Delay between batches
        if (i + batchSize < items.length && delayBetweenBatchesMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatchesMs));
        }
    }

    return { results, errors };
}
=======
/**
 * Rate limiting utilities for parallel processing with controlled concurrency.
 */

/**
 * Execute async tasks in parallel with rate limiting.
 * 
 * @param tasks - Array of async functions to execute
 * @param options - Rate limiting options
 * @returns Array of results (or errors) in the same order as tasks
 */
export async function parallelWithRateLimit<T>(
    tasks: (() => Promise<T>)[],
    options: {
        /** Maximum number of concurrent executions (default: 3) */
        maxConcurrent?: number;
        /** Delay in ms between starting each task (default: 500) */
        delayBetweenMs?: number;
        /** Whether to continue on individual task errors (default: true) */
        continueOnError?: boolean;
        /** Abort signal to cancel remaining tasks */
        abortSignal?: { aborted: boolean };
    } = {}
): Promise<{ results: (T | null)[]; errors: (Error | null)[]; aborted: boolean }> {
    const {
        maxConcurrent = 3,
        delayBetweenMs = 500,
        continueOnError = true,
        abortSignal,
    } = options;

    const results: (T | null)[] = new Array(tasks.length).fill(null);
    const errors: (Error | null)[] = new Array(tasks.length).fill(null);

    let activeCount = 0;
    let nextIndex = 0;
    let wasAborted = false;


    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const executeTask = async (index: number): Promise<void> => {
        try {
            // Check abort before executing
            if (abortSignal?.aborted) {
                wasAborted = true;
                return;
            }
            results[index] = await tasks[index]();
        } catch (error) {
            errors[index] = error instanceof Error ? error : new Error(String(error));

            // Check for JOB_CANCELLED - this should abort all tasks
            if (error instanceof Error && error.message === 'JOB_CANCELLED') {
                if (abortSignal) abortSignal.aborted = true;
                wasAborted = true;
            }

            if (!continueOnError) {
                throw errors[index];
            }
        } finally {
            activeCount--;
        }
    };

    // Process all tasks with rate limiting
    const runningTasks: Promise<void>[] = [];

    while (nextIndex < tasks.length) {
        // Check abort signal before starting new tasks
        if (abortSignal?.aborted || wasAborted) {
            break;
        }

        // Wait while at max concurrency
        while (activeCount >= maxConcurrent) {
            if (abortSignal?.aborted || wasAborted) break;
            await delay(50); // Small poll interval
        }

        // Check again after waiting
        if (abortSignal?.aborted || wasAborted) break;

        // Start next task
        activeCount++;
        const taskIndex = nextIndex++;
        runningTasks.push(executeTask(taskIndex));

        // Add delay before next task starts (for rate limiting)
        if (nextIndex < tasks.length && delayBetweenMs > 0) {
            await delay(delayBetweenMs);
        }
    }

    // Wait for all started tasks to complete
    await Promise.all(runningTasks);

    return { results, errors, aborted: wasAborted };
}


/**
 * Process items in batches with a delay between batches.
 * Useful for bulk operations where API has per-second limits.
 */
export async function batchProcess<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: {
        batchSize?: number;
        delayBetweenBatchesMs?: number;
    } = {}
): Promise<{ results: R[]; errors: Array<{ index: number; error: Error }> }> {
    const { batchSize = 5, delayBetweenBatchesMs = 1000 } = options;

    const results: R[] = [];
    const errors: Array<{ index: number; error: Error }> = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
            batch.map((item, batchIndex) => processor(item, i + batchIndex))
        );

        for (let j = 0; j < batchResults.length; j++) {
            const result = batchResults[j];
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                errors.push({
                    index: i + j,
                    error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
                });
            }
        }

        // Delay between batches
        if (i + batchSize < items.length && delayBetweenBatchesMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatchesMs));
        }
    }

    return { results, errors };
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

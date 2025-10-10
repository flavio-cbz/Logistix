export type FetchWithRetryOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  // allow callers to override which statuses should be retried
  retryOnStatuses?: number[];
};

/**
 * Small utility: fetchWithRetry
 * - default timeout: 15000 ms
 * - default retries: 3
 * - exponential backoff base delay: 500ms (multiplied by 2^attempt)
 *
 * Works both in browser and Node (uses global fetch). Uses AbortController for timeout.
 */
/**
 * Creates a delay for the specified number of milliseconds
 * 
 * @description Simple delay utility function that returns a Promise that resolves
 * after the specified number of milliseconds. Used internally for retry logic.
 * @param {number} ms - Number of milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after the delay
 * @example
 * ```typescript
 * await delay(1000); // Wait 1 second
 * ```
 * @since 1.0.0
 * @internal
 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic and timeout support
 * 
 * @description Enhanced fetch function with automatic retry logic, exponential backoff,
 * and timeout support. Works in both browser and Node.js environments using global fetch.
 * @param {RequestInfo} input - URL or Request object to fetch
 * @param {FetchWithRetryOptions} [init={}] - Fetch options with retry configuration
 * @returns {Promise<Response>} Promise resolving to the fetch Response
 * @throws {Error} When all retry attempts fail or timeout occurs
 * @example
 * ```typescript
 * const response = await fetchWithRetry('/api/data', {
 *   retries: 3,
 *   timeoutMs: 10000
 * });
 * ```
 * @since 1.0.0
 */
export async function fetchWithRetry(
  input: RequestInfo,
  init: FetchWithRetryOptions = {},
): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? 15000;
  const retries = Math.max(1, init.retries ?? 3);
  const retryDelayMs = init.retryDelayMs ?? 500;
  const retryOnStatuses = init.retryOnStatuses ?? [429, 502, 503, 504];

  let lastError: any;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // Merge signals if provided (prefer caller signal but still enforce timeout)
    const combinedInit: RequestInit = {
      ...init,
      signal: controller.signal,
    };
    // Remove custom options so fetch doesn't get unknown props
    delete (combinedInit as any).timeoutMs;
    delete (combinedInit as any).retries;
    delete (combinedInit as any).retryDelayMs;
    delete (combinedInit as any).retryOnStatuses;

    try {
      const res = await fetch(input, combinedInit);
      clearTimeout(timeout);

      // If response is a server error or rate-limited, decide whether to retry
      if (
        !res.ok &&
        attempt < retries - 1 &&
        retryOnStatuses.includes(res.status)
      ) {
        lastError = new Error(`HTTP ${res.status}`);
        await delay(retryDelayMs * Math.pow(2, attempt));
        continue;
      }

      // Return the response (caller will handle ok vs error)
      return res;
    } catch (err: any) {
      clearTimeout(timeout);
      lastError = err;

      // If aborted due to timeout, treat as retryable
      // const isAbort = err?.name === 'AbortError'

      // If last attempt, rethrow
      if (attempt >= retries - 1) {
        throw err;
      }

      // Otherwise wait exponential backoff and retry
      await delay(retryDelayMs * Math.pow(2, attempt));
      continue;
    }
  }

  // If we exit loop unexpectedly, throw lastError
  throw lastError ?? new Error("fetchWithRetry: unknown error");
}

/**
 * Fetch JSON data with retry logic and automatic error handling
 * 
 * @description Convenience function that combines fetchWithRetry with JSON parsing
 * and automatic error handling for non-ok responses. Throws on HTTP errors.
 * @template T - Type of the expected JSON response
 * @param {RequestInfo} input - URL or Request object to fetch
 * @param {FetchWithRetryOptions} [init={}] - Fetch options with retry configuration
 * @returns {Promise<T>} Promise resolving to the parsed JSON data
 * @throws {Error} When request fails, times out, or returns non-ok status
 * @example
 * ```typescript
 * const data = await fetchJsonWithRetry<UserData>('/api/user/123');
 * ```
 * @since 1.0.0
 */
export async function fetchJsonWithRetry<T = any>(
  input: RequestInfo,
  init: FetchWithRetryOptions = {},
): Promise<T> {
  const res = await fetchWithRetry(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const msg = text ? `${res.status} - ${text}` : `HTTP ${res.status}`;
    const err = new Error(`Erreur réseau: ${msg}`);
    (err as any).status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

export default fetchWithRetry;

export type FetchWithRetryOptions = RequestInit & {
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
  // allow callers to override which statuses should be retried
  retryOnStatuses?: number[]
}

/**
 * Small utility: fetchWithRetry
 * - default timeout: 15000 ms
 * - default retries: 3
 * - exponential backoff base delay: 500ms (multiplied by 2^attempt)
 *
 * Works both in browser and Node (uses global fetch). Uses AbortController for timeout.
 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchWithRetry(input: RequestInfo, init: FetchWithRetryOptions = {}): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? 15000
  const retries = Math.max(1, init.retries ?? 3)
  const retryDelayMs = init.retryDelayMs ?? 500
  const retryOnStatuses = init.retryOnStatuses ?? [429, 502, 503, 504]

  let lastError: any

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    // Merge signals if provided (prefer caller signal but still enforce timeout)
    const combinedInit: RequestInit = {
      ...init,
      signal: controller.signal,
    }
    // Remove custom options so fetch doesn't get unknown props
    delete (combinedInit as any).timeoutMs
    delete (combinedInit as any).retries
    delete (combinedInit as any).retryDelayMs
    delete (combinedInit as any).retryOnStatuses

    try {
      const res = await fetch(input, combinedInit)
      clearTimeout(timeout)

      // If response is a server error or rate-limited, decide whether to retry
      if (!res.ok && attempt < retries - 1 && retryOnStatuses.includes(res.status)) {
        lastError = new Error(`HTTP ${res.status}`)
        await delay(retryDelayMs * Math.pow(2, attempt))
        continue
      }

      // Return the response (caller will handle ok vs error)
      return res
    } catch (err: any) {
      clearTimeout(timeout)
      lastError = err

      // If aborted due to timeout, treat as retryable
      const isAbort = err?.name === 'AbortError'

      // If last attempt, rethrow
      if (attempt >= retries - 1) {
        throw err
      }

      // Otherwise wait exponential backoff and retry
      await delay(retryDelayMs * Math.pow(2, attempt))
      continue
    }
  }

  // If we exit loop unexpectedly, throw lastError
  throw lastError ?? new Error('fetchWithRetry: unknown error')
}

/**
 * Helper: fetch JSON with retry and automatic error when non-ok
 */
export async function fetchJsonWithRetry<T = any>(input: RequestInfo, init: FetchWithRetryOptions = {}): Promise<T> {
  const res = await fetchWithRetry(input, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const msg = text ? `${res.status} - ${text}` : `HTTP ${res.status}`
    const err = new Error(`Erreur réseau: ${msg}`)
    ;(err as any).status = res.status
    throw err
  }
  return (await res.json()) as T
}

export default fetchWithRetry
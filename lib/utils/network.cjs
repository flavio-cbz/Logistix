/**
 * CommonJS wrapper for fetchWithRetry to be used by legacy/scripts CommonJS files.
 * Uses global fetch (Node 18+ or polyfilled env).
 */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(input, init = {}) {
  const timeoutMs = init.timeoutMs ?? 15000;
  const retries = Math.max(1, init.retries ?? 3);
  const retryDelayMs = init.retryDelayMs ?? 500;
  const retryOnStatuses = init.retryOnStatuses ?? [429, 502, 503, 504];

  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // clone init without custom options
    const combined = Object.assign({}, init, { signal: controller.signal });
    delete combined.timeoutMs;
    delete combined.retries;
    delete combined.retryDelayMs;
    delete combined.retryOnStatuses;

    try {
      const res = await fetch(input, combined);
      clearTimeout(timeout);

      if (!res.ok && attempt < retries - 1 && retryOnStatuses.includes(res.status)) {
        lastError = new Error(`HTTP ${res.status}`);
        await delay(retryDelayMs * Math.pow(2, attempt));
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      if (attempt >= retries - 1) throw err;
      await delay(retryDelayMs * Math.pow(2, attempt));
      continue;
    }
  }

  throw lastError || new Error('fetchWithRetry: unknown error');
}

module.exports = { fetchWithRetry };
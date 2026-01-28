<<<<<<< HEAD

// Simple in-memory cache for USD->EUR rate to avoid frequent network calls
let _cachedUsdToEur: { rate: number; fetchedAt: number } | null = null;

export async function getUsdToEurRate(): Promise<number> {
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

    }

    // fallback conservative default
    return 0.95; // ~1 USD = 0.95 EUR (approximate default)
}
=======

// Simple in-memory cache for USD->EUR rate to avoid frequent network calls
let _cachedUsdToEur: { rate: number; fetchedAt: number } | null = null;

export async function getUsdToEurRate(): Promise<number> {
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

    }

    // fallback conservative default
    return 0.95; // ~1 USD = 0.95 EUR (approximate default)
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

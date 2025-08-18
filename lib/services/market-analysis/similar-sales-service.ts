// Service d'extraction et d'analyse des ventes similaires Vinted

import { fetchWithRetry } from '@/lib/utils/network';
import { ApiError } from '@/lib/services/validation/error-types';
import { VINTED_API_URL } from '@/lib/constants/config';

interface AccessTokenResponse {
  access_token_web: string;
  [key: string]: any;
}

/**
 * Récupère dynamiquement un access_token_web via l'API interne si non fourni.
 */
async function getAccessTokenIfNeeded(access_token?: string): Promise<string> {
  if (access_token) return access_token;
  const res = await fetchWithRetry('/api/v1/market-analysis/token', { method: 'GET', timeoutMs: 15000, retries: 3 });
  if (!res.ok) throw new ApiError('Impossible de récupérer un access_token_web valide', res.status);
  const data = (await res.json()) as AccessTokenResponse;
  if (!data.access_token_web) throw new ApiError('Aucun access_token_web retourné par l’API');
  return data.access_token_web;
}

export type SimilarSale = {
  id: string
  title: string
  price: number
  currency: string
  sold_at: string
  seller_id: string
  url: string
  [key: string]: any
}

export type SimilarSalesResult = {
  items: SimilarSale[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

type FetchOptions = {
  query: string
  page?: number
  per_page?: number
  cacheTTL?: number
  timeout?: number
  access_token?: string
}

function cleanSale(raw: any): SimilarSale | null {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '')
  const title = String(raw.title ?? '').trim()
  const price = Number(raw.price?.amount ?? 0)
  const currency = String(raw.price?.currency ?? '')
  const sold_at = String(raw.sold_at ?? '')
  const seller_id = String(raw.seller_id ?? '')
  const url = typeof raw.url === 'string' ? raw.url : ''
  if (!id || !title || !price || !currency || !sold_at) return null
  return { id, title, price, currency, sold_at, seller_id, url }
}

async function fetchSimilarSales({
  query,
  page = 1,
  per_page = 24,
  timeout = 10000, // 10 seconds default timeout
  access_token
}: FetchOptions): Promise<SimilarSalesResult> {
  const url = new URL(VINTED_API_URL)
  url.searchParams.set('search_text', query)
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', String(per_page))

  // LOG: Affiche l’URL utilisée pour l’analyse

  // Récupérer le token si besoin
  const token = await getAccessTokenIfNeeded(access_token);

  let response: Response;
  try {
    response = await fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LogistiX-Validation/1.1',
        'Authorization': `Bearer ${token}`
      },
      timeoutMs: timeout,
      retries: 3
    });
  } catch (err) {
    throw new ApiError('Erreur réseau lors de la requête Vinted', undefined, { query }, err instanceof Error ? err : undefined);
  }

  if (!response.ok) {
    throw new ApiError(`Erreur API Vinted`, response.status, { query, statusText: response.statusText });
  }

  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    throw new ApiError('Réponse Vinted invalide (JSON)', response.status, { query }, err instanceof Error ? err : undefined);
  }

  const itemsRaw = Array.isArray(data.items) ? data.items : []
  const items = itemsRaw.map(cleanSale).filter(Boolean) as SimilarSale[]
  const total = Number(data.total ?? items.length)
  const total_pages = Math.ceil(total / per_page)

  const result: SimilarSalesResult = {
    items,
    total,
    page,
    per_page,
    total_pages
  }

  return result
}

export { fetchSimilarSales }
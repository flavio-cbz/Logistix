
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';
import { getLogger } from '@/lib/utils/logging/logger';
import { VintedSearchParams, VintedItem } from './types';

const logger = getLogger('VintedClientWrapper');

const VINTED_API_BASE = 'https://www.vinted.fr/api/v2';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface VintedResponse {
  items: VintedItem[];
  pagination?: {
    current_page: number;
    total_pages: number;
    total_entries: number;
    per_page: number;
  };
}

export class VintedClientWrapper {
  /**
   * Helper to perform authenticated requests
   */
  private async request(endpoint: string, cookie: string, options: RequestInit = {}): Promise<Response> {
    const url = `${VINTED_API_BASE}${endpoint}`;

    return fetch(url, {
      ...options,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json, text/plain, */*',
        'Cookie': cookie,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        ...options.headers,
      }
    });
  }

  /**
   * Extract Vinted UID from cookie string
   */
  private extractVintedUid(cookie: string): string | null {
    const matchUid = cookie.match(/v_uid=(\d+)/);
    return matchUid?.[1] ?? null;
  }

  /**
   * Helper to retrieve session cookie
   */
  private async getSessionOrThrow(userId: string): Promise<string> {
    const cookie = await vintedSessionManager.getSessionCookie(userId);
    if (!cookie) {
      logger.warn('No session cookie found for user', { userId });
      throw new Error('User not connected to Vinted');
    }
    return cookie;
  }

  /**
   * Searches items on Vinted
   * Automatically injects session cookies if available
   */
  async searchItems(userId: string, options: VintedSearchParams): Promise<VintedResponse> {
    try {
      const cookie = await this.getSessionOrThrow(userId);

      // Prepare query params
      const params = new URLSearchParams();
      if (options.searchText) params.append('search_text', options.searchText);
      if (options.brandId) params.append('brand_ids[]', options.brandId.toString());
      if (options.catalogId) params.append('catalog_ids[]', options.catalogId.toString());
      if (options.colorId) params.append('color_ids[]', options.colorId.toString());
      if (options.priceFrom) params.append('price_from', options.priceFrom.toString());
      if (options.priceTo) params.append('price_to', options.priceTo.toString());

      if (options.statusIds) {
        options.statusIds.forEach(id => params.append('status_ids[]', id.toString()));
      }

      // Standard params
      params.append('order', options.order || 'newest_first');
      params.append('per_page', (options.perPage || options.limit || 20).toString());
      params.append('page', '1');

      const endpoint = `/catalog/items?${params.toString()}`;
      logger.info('Executing Vinted Search', { endpoint });

      const response = await this.request(endpoint, cookie);

      if (!response.ok) {
        const text = await response.text();
        logger.error('Vinted API Error', { status: response.status, body: text });
        throw new Error(`Vinted API returned ${response.status}: ${text}`);
      }

      const data = await response.json();

      logger.info('Vinted Search Success', {
        itemCount: data.items ? data.items.length : 'N/A'
      });

      return data as VintedResponse;
    } catch (error) {
      logger.error('Vinted search failed', { error });
      throw error;
    }
  }

  async getSoldItems(userId: string): Promise<VintedItem[]> {
    try {
      const cookie = await this.getSessionOrThrow(userId);
      const vintedUserId = this.extractVintedUid(cookie);

      if (!vintedUserId) {
        logger.error('Could not extract Vinted User ID from cookie', { userId });
        throw new Error('Session Vinted invalide (UID manquant)');
      }

      logger.info('Fetching wardrobe items', { userId, vintedUserId });

      const response = await this.request(
        `/wardrobe/${vintedUserId}/items?order=newest_first&per_page=100`,
        cookie
      );

      if (response.ok) {
        const data = await response.json();
        return (data.items || []) as VintedItem[];
      }

      if (response.status === 404) {
        // Fallback: Maybe user has no items or endpoint is restricted?
        // Try fetching user profile just to verify connectivity
        const userRes = await this.request(`/users/${vintedUserId}`, cookie);

        if (userRes.ok) {
          logger.warn('User Items returned 404, but User Profile is accessible. History might be hidden.');
          return [];
        }
      }

      throw new Error(`Failed to fetch items: ${response.status}`);
    } catch (error) {
      logger.error('Error fetching sold items', { error: String(error) });
      throw error;
    }
  }
}

export const vintedClient = new VintedClientWrapper();

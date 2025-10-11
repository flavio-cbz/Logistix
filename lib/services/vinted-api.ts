import { autoPerf } from "@/lib/services/auto-performance-integration";
// import { getVintedEndpoint } from "@/lib/services/auto-configuration";

export interface VintedResponse<T> {
  data: T;
}

export class VintedApiClient {
  static async getJson<T>(
    endpointName: string,
    init: RequestInit = {},
  ): Promise<T> {
    const url = `https://api.vinted.fr/${endpointName}`;
    const res = await autoPerf.autoFetch(url, {
      ...init,
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Vinted API ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  static async postJson<T>(
    endpointName: string,
    body: unknown,
    init: RequestInit = {},
  ): Promise<T> {
    const url = `https://api.vinted.fr/${endpointName}`;
    const res = await autoPerf.autoFetch(url, {
      ...init,
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Vinted API ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }
}

export const vintedApi = VintedApiClient;

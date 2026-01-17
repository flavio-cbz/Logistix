import { redirect } from 'next/navigation';

interface ApiFetchOptions extends RequestInit {
  retryAuthRedirect?: boolean; // auto redirect on 401
  expectedStatus?: number | number[]; // acceptable status codes
}

interface ApiErrorDetails {
  status: number;
  code?: string | undefined;
  message: string;
  requestId?: string | undefined;
  body?: unknown;
}

interface ErrorPayload {
  code?: string;
  message?: string;
  requestId?: string;
}

export class ApiError extends Error implements ApiErrorDetails {
  status: number;
  code?: string | undefined;
  requestId?: string | undefined;
  body?: unknown;
  constructor(details: ApiErrorDetails) {
    super(details.message);
    this.status = details.status;
    this.code = details.code;
    this.requestId = details.requestId;
    this.body = details.body;
  }
}

function normalizeStatuses(expected?: number | number[]): number[] | undefined {
  if (expected === undefined) return undefined;
  return Array.isArray(expected) ? expected : [expected];
}

export async function apiFetch<T = unknown>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { retryAuthRedirect = true, expectedStatus, headers, ...rest } = options;
  const allowed = normalizeStatuses(expectedStatus);

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {})
    },
    ...rest,
  });

  const contentType = response.headers.get('content-type') || '';
  let payload: unknown = undefined;
  if (contentType.includes('application/json')) {
    try { payload = await response.json(); } catch { /* noop */ }
  } else {
    try { payload = await response.text(); } catch { /* noop */ }
  }

  const okByExpectation = allowed ? allowed.includes(response.status) : response.ok;

  if (!okByExpectation) {
    const errorPayload = payload as ErrorPayload | undefined;
    const apiErr = new ApiError({
      status: response.status,
      code: errorPayload?.code,
      message: errorPayload?.message || `API request failed (${response.status})`,
      requestId: errorPayload?.requestId,
      body: payload,
    });

    if (response.status === 401 && retryAuthRedirect) {
      // Côté client: rediriger (si hook côté RSC, laisser l'appelant gérer)
      if (typeof window !== 'undefined') {
        window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
      } else {
        // Server components
        redirect('/login');
      }
    }
    throw apiErr;
  }

  return payload as T;
}

// Helpers spécifiques
export async function postJson<TReq, TRes = unknown>(url: string, body: TReq, options: Omit<ApiFetchOptions, 'body' | 'method'> = {}) {
  return apiFetch<TRes>(url, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

export async function putJson<TReq, TRes = unknown>(url: string, body: TReq, options: Omit<ApiFetchOptions, 'body' | 'method'> = {}) {
  return apiFetch<TRes>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
    ...options,
  });
}

export async function patchJson<TReq, TRes = unknown>(url: string, body: TReq, options: Omit<ApiFetchOptions, 'body' | 'method'> = {}) {
  return apiFetch<TRes>(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
    ...options,
  });
}

export async function deleteJson<TRes = unknown>(url: string, options: Omit<ApiFetchOptions, 'method'> = {}) {
  return apiFetch<TRes>(url, { method: 'DELETE', ...options });
}
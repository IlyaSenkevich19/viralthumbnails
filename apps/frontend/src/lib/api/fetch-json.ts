import { ApiError } from './api-error';

/** Calls the Nest API through Next.js `/api/*` rewrite. */
export async function fetchJson<T>(
  path: string,
  accessToken: string | null,
  init?: RequestInit,
): Promise<T> {
  const url = path.startsWith('/') ? path : `/${path}`;
  const headers = new Headers(init?.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`/api${url}`, { ...init, headers });
  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const body = (await res.json()) as {
        statusCode?: number;
        message?: string | string[];
        code?: string;
        error?: string;
      };
      if (typeof body.message === 'string' && body.message.length > 0) {
        message = body.message;
      } else if (Array.isArray(body.message)) {
        const parts = body.message.map((m) =>
          typeof m === 'string' ? m : JSON.stringify(m),
        );
        message = parts.join(', ') || message;
      }
      if ((!message || message === res.statusText) && body.error) message = body.error;
      if (typeof body.code === 'string' && body.code.length > 0) code = body.code;
    } catch {
      /* ignore */
    }
    throw new ApiError(message || `Request failed: ${res.status}`, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** POST `multipart/form-data` (do not set `Content-Type`; boundary is set automatically). */
export async function fetchMultipart<T>(
  path: string,
  accessToken: string | null,
  formData: FormData,
): Promise<T> {
  const url = path.startsWith('/') ? path : `/${path}`;
  const headers = new Headers();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const res = await fetch(`/api${url}`, { method: 'POST', body: formData, headers });
  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const body = (await res.json()) as {
        statusCode?: number;
        message?: string | string[];
        code?: string;
        error?: string;
      };
      if (typeof body.message === 'string' && body.message.length > 0) {
        message = body.message;
      } else if (Array.isArray(body.message)) {
        const parts = body.message.map((m) =>
          typeof m === 'string' ? m : JSON.stringify(m),
        );
        message = parts.join(', ') || message;
      }
      if ((!message || message === res.statusText) && body.error) message = body.error;
      if (typeof body.code === 'string' && body.code.length > 0) code = body.code;
    } catch {
      /* ignore */
    }
    throw new ApiError(message || `Request failed: ${res.status}`, res.status, code);
  }
  return res.json() as Promise<T>;
}

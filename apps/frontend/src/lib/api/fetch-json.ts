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
    try {
      const body = (await res.json()) as {
        message?: string | string[] | Array<{ constraints?: Record<string, string> }>;
        error?: string;
      };
      if (typeof body.message === 'string') {
        message = body.message;
      } else if (Array.isArray(body.message)) {
        const parts = body.message.map((m) =>
          typeof m === 'string' ? m : JSON.stringify(m),
        );
        message = parts.join(', ');
      }
      if (!message && body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function normalizeExceptionMessage(message: unknown, fallback: string): string {
  if (typeof message === 'string' && message.length > 0) return message;
  if (Array.isArray(message)) {
    const parts = message.map((m) => (typeof m === 'string' ? m : JSON.stringify(m)));
    const joined = parts.join(', ');
    return joined.length > 0 ? joined : fallback;
  }
  return fallback;
}

/**
 * Comma- or whitespace-separated Supabase auth user UUIDs.
 * Set `ADMIN_USER_IDS` in apps/frontend/.env.local. If unset or empty, no user passes admin checks.
 */
export function parseAdminUserIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function userIdIsAdmin(userId: string | undefined | null): boolean {
  if (!userId) return false;
  const ids = parseAdminUserIds();
  if (ids.size === 0) return false;
  return ids.has(userId);
}

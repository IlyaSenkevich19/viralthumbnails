/**
 * Syncs env vars from root .env to apps/frontend/.env.local so Next.js sees them:
 * - all NEXT_PUBLIC_* (browser + server)
 *
 * Nest reads root `.env` on its own (including `LEAD_INTAKE_WEBHOOK_URL` for CRM). The frontend bundle
 * does not need the webhook URL — CRM is only called from the backend.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const outPath = path.join(rootDir, 'apps', 'frontend', '.env.local');

if (!fs.existsSync(envPath)) {
  console.warn('[sync-frontend-env] Root .env not found, skipping sync.');
  process.exit(0);
}

const raw = fs.readFileSync(envPath, 'utf8');
const lines = raw.split(/\r?\n/);
const nextPublic = lines.filter((line) => {
  const trimmed = line.trim();
  return trimmed.startsWith('NEXT_PUBLIC_') && !trimmed.startsWith('#');
});

const outContent =
  '# Auto-generated from root .env — do not edit manually\n' +
  nextPublic.join('\n') +
  (nextPublic.length ? '\n' : '');

fs.writeFileSync(outPath, outContent, 'utf8');
console.log('[sync-frontend-env] Synced', nextPublic.length, 'NEXT_PUBLIC_* lines to apps/frontend/.env.local');

/**
 * Syncs env vars from root .env to apps/frontend/.env.local so Next.js sees them:
 * - all NEXT_PUBLIC_* (browser + server)
 * - LEAD_INTAKE_* (server-only Route Handlers, e.g. /api/lead-intake)
 *
 * Nest backend still reads root .env on its own; this file is only for the frontend app.
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

const LEAD_INTAKE_KEYS = ['LEAD_INTAKE_WEBHOOK_URL', 'LEAD_INTAKE_DEBUG'];
const leadIntake = lines.filter((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return false;
  return LEAD_INTAKE_KEYS.some((k) => trimmed.startsWith(`${k}=`));
});

const outContent =
  '# Auto-generated from root .env — do not edit manually\n' +
  nextPublic.join('\n') +
  (nextPublic.length ? '\n' : '') +
  leadIntake.join('\n') +
  (leadIntake.length ? '\n' : '');

fs.writeFileSync(outPath, outContent, 'utf8');
console.log(
  '[sync-frontend-env] Synced',
  nextPublic.length,
  'NEXT_PUBLIC_* and',
  leadIntake.length,
  'LEAD_INTAKE_* lines to apps/frontend/.env.local',
);

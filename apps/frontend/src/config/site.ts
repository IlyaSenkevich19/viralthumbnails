/** Display name; set `NEXT_PUBLIC_APP_NAME` in root `.env` (synced to frontend on `yarn dev` / `yarn build`). */
export const siteName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'App';

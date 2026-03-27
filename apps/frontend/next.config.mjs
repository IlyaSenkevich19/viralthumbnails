/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_* must exist when Vercel runs `next build`, or the client bundle gets undefined and Supabase throws at runtime.
if (process.env.VERCEL === '1') {
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].filter(
    (key) => !process.env[key]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `[next.config] Missing ${missing.join(', ')}. In Vercel: Settings → Environment Variables → add for Production (and Preview if needed) → Redeploy.`,
    );
  }
}

const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
);

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

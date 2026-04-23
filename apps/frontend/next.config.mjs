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

// Vercel: set NEXT_PUBLIC_BACKEND_URL for production; otherwise rewrites fall back to localhost:3001.
const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
let supabaseHostname = null;
if (supabaseUrl) {
  try {
    supabaseHostname = new URL(supabaseUrl).hostname;
  } catch {
    supabaseHostname = null;
  }
}

const nextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: 'https',
            hostname: supabaseHostname,
          },
        ]
      : [],
  },
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

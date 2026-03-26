/** @type {import('next').NextConfig} */
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

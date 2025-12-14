/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_ACTIVEPIECES_URL: process.env.NEXT_PUBLIC_ACTIVEPIECES_URL,
    NEXT_PUBLIC_FLOWISE_URL: process.env.NEXT_PUBLIC_FLOWISE_URL,
    NEXT_PUBLIC_TEMPORAL_URL: process.env.NEXT_PUBLIC_TEMPORAL_URL,
    NEXT_PUBLIC_GRAFANA_URL: process.env.NEXT_PUBLIC_GRAFANA_URL,
    NEXT_PUBLIC_NANGO_URL: process.env.NEXT_PUBLIC_NANGO_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  },
  async rewrites() {
    // In development prefer local in-app /api routes to allow testing of demo endpoints.
    // Only enable the proxy rewrite when not in development and an API base is provided.
    const apiBase = process.env.NODE_ENV === 'development' ? undefined : process.env.NEXT_PUBLIC_API_URL
    // If API base is provided, proxy /api/* through Next to avoid CORS issues on Vercel
    if (apiBase) {
      return [
        {
          source: '/api/:path*',
          destination: `${apiBase}/api/:path*`,
        },
      ]
    }
    return []
  },
}

module.exports = nextConfig
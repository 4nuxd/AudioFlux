/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // For Docker and production deployments

  // Performance optimizations
  compress: true, // Enable gzip compression
  reactStrictMode: true, // Better performance in dev

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
    formats: ['image/webp'], // Use WebP for better compression
  },

  // Disable source maps in production for smaller bundle
  productionBrowserSourceMaps: false,

  experimental: {
    optimizeCss: true, // Optimize CSS loading
    optimizePackageImports: ['lucide-react'], // Tree-shake icon library
  },

  // Turbopack config (required for Next.js 16)
  turbopack: {
    // Empty config to silence warning - works fine with defaults
  },

  // Headers for better caching and performance
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
        ],
      },
    ]
  },
}

export default nextConfig

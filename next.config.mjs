/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Reduce chunk loading issues in development
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 0,
        maxSize: 244000,
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true
          }
        }
      }
    }
    return config
  },
  experimental: {
    // Reduce memory usage and improve chunk loading
    optimizeCss: false,
  },
  serverExternalPackages: ['mysql2']
}

export default nextConfig

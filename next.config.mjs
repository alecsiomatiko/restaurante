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
  experimental: {
    esmExternals: false,
  },
  serverExternalPackages: ['mysql2'],
  // Suppress hydration warnings during development
  reactStrictMode: true,
  swcMinify: true,
}

export default nextConfig

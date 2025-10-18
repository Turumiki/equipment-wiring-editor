/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove deprecated appDir option
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Reduce webpack build output
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.stats = 'errors-warnings'
    }
    return config
  },
  // Reduce console output in development
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig
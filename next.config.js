/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, dev }) => {
    // Fix for require-in-the-middle warning from Sentry/OpenTelemetry

    // Fallbacks for Node.js modules in client-side bundles

    // Optimize bundle splitting
    if (!dev) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Framework chunk (React, Next.js)
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            chunks: 'all',
            priority: 40,
            enforce: true,
            reuseExistingChunk: true
          },
          // UI libraries chunk
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion|class-variance-authority|clsx|tailwind-merge)[\\/]/,
            name: 'ui-libs',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
            enforce: true
          },
          // Charts and visualization libraries
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
            name: 'charts',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true
          },
          // Form libraries
          forms: {
            test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/,
            name: 'forms',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true
          },
          // Date libraries
          dates: {
            test: /[\\/]node_modules[\\/](date-fns|react-day-picker)[\\/]/,
            name: 'dates',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true
          },
          // Utility libraries
          utils: {
            test: /[\\/]node_modules[\\/](lodash|uuid|axios)[\\/]/,
            name: 'utils',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true
          },
          // Vendor chunk (remaining node_modules)
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true
          },
          // Common chunk (shared code between pages)
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true
          }
        }
      };

      // Additional optimizations
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      config.optimization.moduleIds = 'deterministic';
      config.optimization.chunkIds = 'deterministic';
    }

    return config;
  },

  // Experimental features
  experimental: {
    turbo: {
      enabled: false
    }
  },

  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30 // 30 days
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0'
          }
        ]
      }
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false
      }
    ];
  }
};

module.exports = nextConfig;
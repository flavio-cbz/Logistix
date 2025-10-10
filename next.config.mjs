import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false, // Enable Next.js image optimization
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [],
  },
  // Performance optimizations
  compress: true,
  swcMinify: true,
  poweredByHeader: false,
  
  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Suppress noisy warnings
    config.infrastructureLogging = {
      level: 'error',
    };
    
    // Suppress specific warnings - more comprehensive approach
    config.ignoreWarnings = [
      /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      /require-in-the-middle/,
      /@opentelemetry/,
      /@sentry/,
      /node_modules/,
      (warning) => {
        return warning.message && (
          warning.message.includes('Critical dependency') ||
          warning.message.includes('require-in-the-middle') ||
          warning.message.includes('@opentelemetry') ||
          warning.message.includes('@sentry')
        );
      },
    ];

    // Suppress stats warnings
    config.stats = {
      warnings: false,
      warningsFilter: [
        /Critical dependency/,
        /require-in-the-middle/,
        /@opentelemetry/,
        /@sentry/,
        (warning) => {
          return warning && (
            warning.includes('Critical dependency') ||
            warning.includes('require-in-the-middle') ||
            warning.includes('@opentelemetry') ||
            warning.includes('@sentry')
          );
        },
      ],
    };

    // Externalize problematic modules for server-side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'require-in-the-middle': 'commonjs require-in-the-middle',
        '@opentelemetry/instrumentation': 'commonjs @opentelemetry/instrumentation',
      });
    }

    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          framerMotion: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'framer-motion',
            chunks: 'all',
            priority: 20,
          },
          radixUI: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 15,
          },
          lucideReact: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'lucide-react',
            chunks: 'all',
            priority: 10,
          },
        },
      }
    }
    
    return config
  },
  
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
    // Removed optimizeCss as it was causing build issues
    optimizePackageImports: [
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'date-fns',
      'recharts'
    ],
  },
}

export default withBundleAnalyzer(nextConfig);
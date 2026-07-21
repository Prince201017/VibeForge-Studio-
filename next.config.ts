import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // [V0.A1] Production-ready config for ForgeOS editor
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  // Allow canvas and WebGL rendering
  webpack: (config, { isServer }) => {
    config.externals.push({
      'prettier/parser-babel': 'prettier/parser-babel',
    });
    return config;
  },
  // API proxy to Python FastAPI service
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: '/api/ai/:path*',
          destination: 'http://localhost:8000/ai/:path*',
        },
        {
          source: '/api/render/:path*',
          destination: 'http://localhost:8000/render/:path*',
        },
        {
          source: '/api/export/:path*',
          destination: 'http://localhost:8000/export/:path*',
        },
      ],
    };
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'blob.vercelusercontent.com',
      },
    ],
  },
};

export default nextConfig;

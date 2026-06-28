import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import createMDX from "@next/mdx";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const withMDX = createMDX({
  // remark-gfm not compatible with Turbopack
  // Using react-markdown for table rendering instead
});

const nextConfig: NextConfig = {
  // Lean, self-contained server build for Docker (node server.js)
  output: "standalone",
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  serverExternalPackages: ['smartapi-javascript', 'yahoo-finance2'],
  turbopack: {
    resolveAlias: {
      electron: 'false',
    },
  },
  webpack: (config) => {
    config.externals.push('electron');
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/tools/:path*', destination: '/', permanent: true },
      { source: '/admin/:path*', destination: '/', permanent: true },
      { source: '/pulse', destination: '/signals', permanent: true },
    ];
  },
};

export default withPWA(withMDX(nextConfig));

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ['ascendwebadmin.vercel.app', 'localhost'],

  // Remove the webpack config - use turbopack instead
  turbopack: {},

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'adamhavva.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "https://pub-38396b04723744d4a3f61813ba1c3a11.r2.dev",
        pathname: "/**"
      }
    ],
  },
};

export default nextConfig;
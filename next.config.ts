import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ['ascendwebadmin.vercel.app', 'localhost', "dbe4-114-10-147-97.ngrok-free.app"],

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
    ],
  },
};

export default nextConfig;
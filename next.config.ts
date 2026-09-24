import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ['ascendwebadmin.vercel.app', 'localhost'],
  
  // Remove the webpack config - use turbopack instead
  turbopack: {},
};

export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Force dynamic rendering for all pages to prevent Supabase initialization errors during build
    dynamicIO: true,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig = {
  /* config options here */
  /* config options here */

  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

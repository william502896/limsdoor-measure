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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // 카메라/센서 허용 (모바일 AR에서 중요)
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

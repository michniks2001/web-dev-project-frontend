import type { NextConfig } from "next";

const PRODUCTION_API_ORIGIN = "https://backend-eqvv.onrender.com";

const backendUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ||
  (process.env.NODE_ENV === "production"
    ? PRODUCTION_API_ORIGIN
    : "http://localhost:4000")
);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

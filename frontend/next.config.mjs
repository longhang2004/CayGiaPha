/** @type {import('next').NextConfig} */

const API_PROXY_TARGET =
  process.env.BACKEND_API_URL ?? "http://localhost:8080";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (process.env.USE_BACKEND === "true") {
      return [
        {
          source: "/api/:path*",
          destination: `${API_PROXY_TARGET}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;


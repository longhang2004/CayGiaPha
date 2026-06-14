/** @type {import('next').NextConfig} */

// The Spring Boot REST API base URL. In development the Next.js dev server
// proxies `/api/*` to the backend so that the browser sees same-origin
// requests and the session cookie (HttpOnly, Secure, SameSite) flows
// automatically. See src/lib/apiClient.ts.
const API_PROXY_TARGET =
  process.env.BACKEND_API_URL ?? "http://localhost:8080";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

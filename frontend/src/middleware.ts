import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that do not require session cookie
const PUBLIC_API_ROUTES = [
  "/api/v1/health",
  "/api/v1/legal/tos",
  "/api/v1/legal/privacy",
  "/api/v1/auth/signup",
  "/api/v1/auth/signup/verify",
  "/api/v1/auth/signin",
  "/api/v1/auth/signin/verify",
  "/api/migration",
];

// Returns true if path is a public API route or matches claim verification
function isPublicApiRoute(pathname: string): boolean {
  if (PUBLIC_API_ROUTES.includes(pathname)) {
    return true;
  }
  // Claim verification path is public: /api/v1/persons/[id]/claim/verify
  if (/\/api\/v1\/persons\/[^/]+\/claim\/verify/.test(pathname)) {
    return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block prototype routes in production to prevent auth bypasses from
  // leaking into production builds.
  if (
    pathname.startsWith("/prototype") &&
    process.env.NODE_ENV === "production"
  ) {
    return new NextResponse(
      JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found." } }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // If proxying to backend is enabled, bypass local middleware logic completely
  if (process.env.USE_BACKEND === "true") {
    return NextResponse.next();
  }

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Define CORS headers
  const origin = request.headers.get("origin") || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Share-Token, Cookie, Accept, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  // 1. CORS Preflight pre-handling
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // 2. Route Protection Check
  const sessionCookie = request.cookies.get("SESSION")?.value;
  const isPublic = isPublicApiRoute(pathname);

  if (!isPublic && !sessionCookie) {
    return new NextResponse(
      JSON.stringify({
        error: {
          code: "NOT_AUTHORIZED",
          message: "You must be logged in to access this endpoint.",
        },
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  // 3. Set standard response security headers
  const response = NextResponse.next();
  
  // Set CORS headers on the next response
  Object.entries(corsHeaders).forEach(([key, val]) => {
    response.headers.set(key, val);
  });

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

// Config to match /api/:path* routes and /prototype/:path* routes
// (prototype guard runs first; API middleware only applies to /api/ paths)
export const config = {
  matcher: ["/api/:path*", "/prototype/:path*"],
};

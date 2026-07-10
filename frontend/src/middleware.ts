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
  "/api/v1/auth/google",
  "/api/v1/auth/password-reset/request",
  "/api/v1/auth/password-reset/confirm",
  "/api/v1/feedback",
];

/** Allowed browser origins for credentialed CORS (never reflect arbitrary Origin). */
function allowedCorsOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) {
    return null;
  }
  const configured = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]
    .filter((value): value is string => !!value && value.trim().length > 0)
    .map((value) => value.replace(/\/$/, ""));
  const normalized = requestOrigin.replace(/\/$/, "");
  return configured.includes(normalized) ? requestOrigin : null;
}

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

  // Define CORS headers — only for allowlisted origins (never echo arbitrary Origin).
  const allowedOrigin = allowedCorsOrigin(request.headers.get("origin"));
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Share-Token, Cookie, Accept, Authorization",
    "Vary": "Origin",
  };
  if (allowedOrigin) {
    corsHeaders["Access-Control-Allow-Origin"] = allowedOrigin;
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  }

  // 1. CORS Preflight pre-handling
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: allowedOrigin ? 204 : 403,
      headers: corsHeaders,
    });
  }

  // 2. CSRF Origin check for cookie-authenticated mutations (defense-in-depth with SameSite=Lax).
  const method = request.method.toUpperCase();
  const isSafeMethod = method === "GET" || method === "HEAD" || method === "OPTIONS" || method === "TRACE";
  if (!isSafeMethod && pathname.startsWith("/api/")) {
    const originHeader = request.headers.get("origin");
    const refererHeader = request.headers.get("referer");
    if (originHeader || refererHeader) {
      const candidate =
        originHeader ||
        (() => {
          try {
            const u = new URL(refererHeader!);
            return `${u.protocol}//${u.host}`;
          } catch {
            return null;
          }
        })();
      if (!allowedCorsOrigin(candidate)) {
        return new NextResponse(
          JSON.stringify({
            error: {
              code: "NOT_AUTHORIZED",
              message: "Cross-origin request rejected.",
            },
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }
    }
  }

  // 3. Route Protection Check
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

  // 4. Set standard response security headers
  const response = NextResponse.next();
  
  // Set CORS headers on the next response
  Object.entries(corsHeaders).forEach(([key, val]) => {
    response.headers.set(key, val);
  });

  // Security headers (API responses)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

// Config to match /api/:path* routes and /prototype/:path* routes
// (prototype guard runs first; API middleware only applies to /api/ paths)
export const config = {
  matcher: ["/api/:path*", "/prototype/:path*"],
};

import { handleApiRoute } from "@/lib/services/routeHelper";
import { authService } from "@/lib/services/auth";
import { hashRateLimitIdentifier, rateLimiter } from "@/lib/services/rateLimiter";
import { auditService, AuditActions } from "@/lib/services/audit";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const { identifier, password } = await request.json();
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

    await rateLimiter.check(
      `signin:${hashRateLimitIdentifier(typeof identifier === "string" ? identifier : "")}`,
      { failClosed: true },
    );
    await rateLimiter.check(`ip:${clientIp}`, { failClosed: true });

    const session = await authService.signInWithPassword(identifier, password);

    await auditService.record(
      session.userId,
      AuditActions.SIGN_IN,
      "user",
      session.userId
    );

    // Set HttpOnly secure session cookie
    cookies().set("SESSION", session.rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });

    return Response.json({
      userId: session.userId,
      expiresAt: session.expiresAt.toISOString(),
    });
  });
}

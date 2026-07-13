import { handleApiRoute } from "@/lib/services/routeHelper";
import { authService, sessionService } from "@/lib/services/auth";
import { hashRateLimitIdentifier, rateLimiter } from "@/lib/services/rateLimiter";
import { auditService, AuditActions } from "@/lib/services/audit";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const { identifier, password, region, acceptedTos, acceptedPrivacy, displayName } = await request.json();
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

    await rateLimiter.check(
      `signup:${hashRateLimitIdentifier(typeof identifier === "string" ? identifier : "")}`,
      { failClosed: true },
    );
    await rateLimiter.check(`ip:${clientIp}`, { failClosed: true });

    const res = await authService.signUp({
      identifier,
      password,
      region,
      acceptedTos,
      acceptedPrivacy,
      displayName,
    });

    await auditService.record(
      res.userId,
      AuditActions.SIGN_UP_VERIFIED,
      "user",
      res.userId
    );

    // Create session and set HttpOnly secure session cookie directly
    const session = await sessionService.create(res.userId);
    cookies().set("SESSION", session.rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });

    return Response.json(res, { status: 201 });
  });
}

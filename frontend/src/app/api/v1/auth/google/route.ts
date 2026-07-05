import { handleApiRoute } from "@/lib/services/routeHelper";
import { authService } from "@/lib/services/auth";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { auditService, AuditActions } from "@/lib/services/audit";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const { idToken, region, acceptedTos, acceptedPrivacy } = await request.json();
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

    await rateLimiter.check(`ip:${clientIp}`);

    const session = await authService.verifyGoogleAuth(idToken, region, acceptedTos, acceptedPrivacy);

    await auditService.record(
      session.userId,
      AuditActions.SIGN_IN,
      "user",
      session.userId
    );

    // Set HttpOnly secure session cookie
    cookies().set("SESSION", session.id, {
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

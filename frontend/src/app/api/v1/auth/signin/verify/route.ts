import { handleApiRoute } from "@/lib/services/routeHelper";
import { authService } from "@/lib/services/auth";
import { auditService, AuditActions } from "@/lib/services/audit";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const { identifier, code } = await request.json();

    const session = await authService.verifySignIn(identifier, code);

    await auditService.record(
      session.userId,
      AuditActions.SIGN_IN,
      "user",
      session.userId
    );

    // Set HttpOnly secure session cookie
    cookies().set("SESSION", session.id, {
      httpOnly: true,
      secure: true,
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

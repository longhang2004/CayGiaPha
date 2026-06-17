import { handleApiRoute } from "@/lib/services/routeHelper";
import { authService, sessionService } from "@/lib/services/auth";
import { consentService } from "@/lib/services/consent";
import { auditService, AuditActions } from "@/lib/services/audit";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const { identifier, code, region, acceptedTos, acceptedPrivacy } = await request.json();

    consentService.requireConsent(acceptedTos, acceptedPrivacy);
    const response = await authService.verifySignUp(identifier, code, region);
    await consentService.recordConsent(response.userId);
    await auditService.record(
      response.userId,
      AuditActions.SIGN_UP_VERIFIED,
      "user",
      response.userId
    );

    // Create session and set HttpOnly secure session cookie
    const session = await sessionService.create(response.userId);
    cookies().set("SESSION", session.id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });

    return Response.json(response);
  });
}

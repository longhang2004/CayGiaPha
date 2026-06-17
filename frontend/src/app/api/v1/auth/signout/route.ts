import { handleApiRoute } from "@/lib/services/routeHelper";
import { authService, sessionService } from "@/lib/services/auth";
import { auditService, AuditActions } from "@/lib/services/audit";
import { cookies } from "next/headers";

export async function POST() {
  return handleApiRoute(async () => {
    const sessionToken = cookies().get("SESSION")?.value;
    let actorUserId: string | null = null;

    if (sessionToken) {
      const session = await sessionService.resolve(sessionToken);
      if (session) {
        actorUserId = session.userId;
      }
      await authService.signOut(sessionToken);
    }

    await auditService.record(
      actorUserId,
      AuditActions.SIGN_OUT,
      "session",
      null
    );

    // Clear the cookie
    cookies().delete("SESSION");

    return new Response(null, { status: 204 });
  });
}

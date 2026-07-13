import { handleApiRoute } from "@/lib/services/routeHelper";
import { ApiException } from "@/lib/services/errors";
import { claimService } from "@/lib/services/claim";
import { getAuthContext } from "@/lib/services/authorization";
import { rateLimiter } from "@/lib/services/rateLimiter";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("You must be signed in to claim this person.");
    }

    const { code } = await request.json();
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      throw ApiException.validation("code", "Code must contain exactly 6 digits.");
    }
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    await rateLimiter.check(`claim-verify-user:${auth.userId}`, { failClosed: true });
    await rateLimiter.check(`claim-verify-ip:${clientIp}`, { failClosed: true });

    const personId = params.id;
    const result = await claimService.verifyClaim(personId, auth.userId, code);

    return Response.json({
      personId: result.claim.personId,
      treeId: result.treeId,
      claimed: true,
    });
  });
}

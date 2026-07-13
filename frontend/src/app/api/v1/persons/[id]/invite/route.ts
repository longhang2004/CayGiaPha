import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { claimService } from "@/lib/services/claim";
import { hashRateLimitIdentifier, rateLimiter } from "@/lib/services/rateLimiter";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("You must be signed in to send a node-linking invitation.");
    }

    const { destination, treeId } = await request.json();
    const personId = params.id;
    if (typeof treeId !== "string" || !treeId) {
      throw ApiException.validation("treeId", "treeId is required.");
    }
    await authorizationService.requireOwner(auth.userId, treeId);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    await rateLimiter.check(`claim-invite-user:${auth.userId}`, { failClosed: true });
    await rateLimiter.check(
      `claim-invite-destination:${hashRateLimitIdentifier(
        typeof destination === "string" ? destination : "",
      )}`,
      { failClosed: true },
    );
    await rateLimiter.check(`claim-invite-ip:${clientIp}`, { failClosed: true });

    await claimService.invite(treeId, personId, destination);

    return new Response(null, { status: 202 }); // Accepted
  });
}

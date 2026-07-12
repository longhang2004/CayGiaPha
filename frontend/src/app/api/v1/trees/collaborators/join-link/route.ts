import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { acceptInvitation } from "@/lib/services/collaborationInvitation";
import { rateLimiter } from "@/lib/services/rateLimiter";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.userId) throw ApiException.notAuthorized("Vui lòng đăng nhập để tham gia cây.");
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await rateLimiter.check(`collaboration-join:${auth.userId}`);
    await rateLimiter.check(`collaboration-join-ip:${clientIp}`);
    const inviteId = new URL(request.url).searchParams.get("inviteId");
    if (!inviteId) throw ApiException.validation("inviteId", "Lời mời không hợp lệ");
    const result = await acceptInvitation(inviteId, auth.userId);
    return Response.json(result.value, { status: result.kind === "pending" ? 202 : 200 });
  });
}

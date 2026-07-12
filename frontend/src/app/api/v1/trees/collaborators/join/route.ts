import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { acceptInvitationCode } from "@/lib/services/collaborationInvitation";
import { rateLimiter } from "@/lib/services/rateLimiter";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.userId) throw ApiException.notAuthorized("Vui lòng đăng nhập để tham gia cây.");
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await rateLimiter.check(`collaboration-join:${auth.userId}`);
    await rateLimiter.check(`collaboration-join-ip:${clientIp}`);
    const code = (new URL(request.url).searchParams.get("code") || "").trim().toLowerCase();
    if (code.length !== 6) throw ApiException.validation("code", "Mã mời 6 ký tự là bắt buộc.");
    const result = await acceptInvitationCode(code, auth.userId);
    return Response.json(result.value, { status: result.kind === "pending" ? 202 : 200 });
  });
}

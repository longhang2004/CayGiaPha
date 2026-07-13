import { handleApiRoute } from "@/lib/services/routeHelper";
import { passwordResetService } from "@/lib/services/passwordReset";
import { hashRateLimitIdentifier, rateLimiter } from "@/lib/services/rateLimiter";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const body = await request.json().catch(() => ({}));
    const identifier = typeof body.identifier === "string" ? body.identifier : "";
    await rateLimiter.check(`password-reset:${hashRateLimitIdentifier(identifier)}`, {
      failClosed: true,
    });
    await rateLimiter.check(`password-reset-ip:${clientIp(request)}`, { failClosed: true });
    await passwordResetService.request(identifier);

    return Response.json(
      { message: "Nếu tài khoản tồn tại, mã xác nhận đã được gửi." },
      { status: 202 },
    );
  });
}

import { cookies } from "next/headers";
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
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    await rateLimiter.check(`password-reset-confirm:${hashRateLimitIdentifier(identifier)}`, {
      failClosed: true,
    });
    await rateLimiter.check(`password-reset-confirm-ip:${clientIp(request)}`, {
      failClosed: true,
    });
    const session = await passwordResetService.confirm(identifier, code, password);

    cookies().set("SESSION", session.rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return Response.json({ userId: session.userId, expiresAt: session.expiresAt.toISOString() });
  });
}

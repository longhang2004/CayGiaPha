import { handleApiRoute } from "@/lib/services/routeHelper";
import { authService } from "@/lib/services/auth";
import { rateLimiter } from "@/lib/services/rateLimiter";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const { identifier } = await request.json();
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

    rateLimiter.check(`signin:${identifier}`);
    rateLimiter.check(`ip:${clientIp}`);

    const res = await authService.signIn(identifier);
    return Response.json(res);
  });
}

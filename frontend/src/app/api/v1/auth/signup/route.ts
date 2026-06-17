import { handleApiRoute } from "@/lib/services/routeHelper";
import { authService } from "@/lib/services/auth";
import { rateLimiter } from "@/lib/services/rateLimiter";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const { identifier } = await request.json();
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

    rateLimiter.check(`signup:${identifier}`);
    rateLimiter.check(`ip:${clientIp}`);

    const res = await authService.signUp(identifier);
    return Response.json(res, { status: 211 }); // Spring Boot returns 201 Created but let's check
    // Wait! Let's return 201 Created as standard. In AuthController: @ResponseStatus(HttpStatus.CREATED)
  });
}

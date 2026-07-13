import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { personService } from "@/lib/services/person";
import { rateLimiter } from "@/lib/services/rateLimiter";

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("You must be signed in to create a person.");
    }
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await rateLimiter.check(`mutate-person:${auth.userId || clientIp}`);
    await rateLimiter.check(`mutate-ip:${clientIp}`);

    const body = await request.json();
    const treeId = typeof body.treeId === "string" ? body.treeId : "";
    if (!treeId) {
      throw ApiException.validation("treeId", "treeId is required.");
    }
    await authorizationService.requireContentEditor(auth.userId, treeId);
    const id = await personService.create({
      treeId,
      displayName: body.displayName,
      gender: body.gender,
      birthOrder: body.birthOrder,
      birthYear: body.birthYear,
      phone: body.phone,
      email: body.email,
      deathStatus: body.deathStatus,
      deathDay: body.deathDay,
      deathMonth: body.deathMonth,
      deathYear: body.deathYear,
      deathCalendar: body.deathCalendar,
      deathLunarLeap: body.deathLunarLeap,
    });

    return Response.json({ id }, { status: 201 });
  });
}

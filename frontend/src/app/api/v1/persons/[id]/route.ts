import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { personService } from "@/lib/services/person";
import { personDeletionService } from "@/lib/services/personDeletion";
import { db } from "@/lib/db";
import { trees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { projectPerson } from "@/lib/services/privacy";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get("treeId");
    if (!treeId) {
      throw ApiException.validation("treeId", "treeId query parameter is required.");
    }

    const shareToken = request.headers.get("x-share-token");
    await authorizationService.requireReadAccess(auth.userId, treeId, shareToken);

    const personId = params.id;
    const person = await personService.read(treeId, personId);

    const role = await authorizationService.classify(auth.userId, treeId, personId);

    const tree = await db
      .select()
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);

    return Response.json(projectPerson(person, {
      role,
      livingRedaction: tree?.livingRedaction !== false,
    }));
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get("treeId");
    if (!treeId) {
      throw ApiException.validation("treeId", "treeId query parameter is required.");
    }

    const personId = params.id;
    await authorizationService.requireContentEditor(auth.userId, treeId, personId);
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await rateLimiter.check(`mutate-person:${auth.userId || clientIp}`);
    await rateLimiter.check(`mutate-ip:${clientIp}`);

    const body = await request.json();
    const updated = await personService.edit(treeId, personId, body);
    const role = await authorizationService.classify(auth.userId, treeId, personId);
    return Response.json(projectPerson(updated, { role, livingRedaction: false }));
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const { searchParams } = new URL(request.url);
    const treeId = searchParams.get("treeId");
    if (!treeId) {
      throw ApiException.validation("treeId", "treeId query parameter is required.");
    }

    const personId = params.id;
    await authorizationService.requireContentEditor(auth.userId, treeId, personId);

    const res = await personDeletionService.beginDeletion(treeId, personId);
    return Response.json(res);
  });
}

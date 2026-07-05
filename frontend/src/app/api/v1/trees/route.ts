import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { trees, treeCollaborators } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";
import { rateLimiter } from "@/lib/services/rateLimiter";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.userId) {
      throw ApiException.notAuthorized("Vui lòng đăng nhập để xem danh sách cây.");
    }

    // Find trees owned by this user
    const ownedTrees = await db
      .select()
      .from(trees)
      .where(eq(trees.ownerUserId, auth.userId));

    // Find trees this user collaborates on
    const collaboratedTrees = await db
      .select({
        id: trees.id,
        ownerUserId: trees.ownerUserId,
        name: trees.name,
        region: trees.region,
        createdAt: trees.createdAt,
        sharing: trees.sharing,
        livingRedaction: trees.livingRedaction,
      })
      .from(treeCollaborators)
      .innerJoin(trees, eq(treeCollaborators.treeId, trees.id))
      .where(eq(treeCollaborators.userId, auth.userId));

    // Combine and deduplicate
    const allTreesMap = new Map<string, any>();
    ownedTrees.forEach(t => allTreesMap.set(t.id, { ...t, isOwner: true }));
    collaboratedTrees.forEach(t => {
      if (!allTreesMap.has(t.id)) {
        allTreesMap.set(t.id, { ...t, isOwner: false });
      }
    });

    return Response.json(Array.from(allTreesMap.values()));
  });
}

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.userId) {
      throw ApiException.notAuthorized("Vui lòng đăng nhập để tạo cây mới.");
    }
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await rateLimiter.check(`create-tree:${auth.userId}`);
    await rateLimiter.check(`mutate-ip:${clientIp}`);

    const body = await request.json().catch(() => ({}));
    const name = (body.name || "").trim() || "Cây Gia Phả mới";
    const region = (body.region || "").trim() || "Bac";

    if (region !== "Bac" && region !== "Trung" && region !== "Nam") {
      throw ApiException.validation("region", "Region must be one of Bac, Trung, or Nam.");
    }

    const [saved] = await db
      .insert(trees)
      .values({
        ownerUserId: auth.userId,
        name,
        region,
        sharing: "private",
        livingRedaction: true,
      })
      .returning();

    return Response.json(saved);
  });
}

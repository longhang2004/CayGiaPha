import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ApiException } from "@/lib/services/errors";

export async function GET() {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.accountNotFound("No active session found.");
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId))
      .then((rows) => rows[0]);

    if (!user) {
      throw ApiException.accountNotFound("No user found for current session.");
    }

    return Response.json({
      userId: user.id,
      treeId: auth.ownedTreeId,
      identifier: user.phone || user.email || "",
      verified: user.verified,
    });
  });
}

import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { db, ensureUserDisplayNameSchema } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ApiException } from "@/lib/services/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.accountNotFound("No active session found.");
    }

    // Legacy accounts predate display_name; ensure column exists before selecting it.
    await ensureUserDisplayNameSchema();

    const user = await db
      .select({
        id: users.id,
        phone: users.phone,
        email: users.email,
        displayName: users.displayName,
        verified: users.verified,
        role: users.role,
      })
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
      displayName: user.displayName ?? null,
      verified: user.verified,
      role: user.role === "admin" ? "admin" : "user",
    });
  });
}

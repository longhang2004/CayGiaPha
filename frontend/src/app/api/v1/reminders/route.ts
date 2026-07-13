import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { inAppReminders } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("User is not authenticated.");
    }

    const results = await db
      .select()
      .from(inAppReminders)
      .where(eq(inAppReminders.userId, auth.userId))
      .orderBy(desc(inAppReminders.createdAt));

    return Response.json(
      results.map((r) => ({
        id: r.id,
        userId: r.userId,
        personId: r.personId,
        title: r.title,
        content: r.content,
        daysUntil: r.daysUntil,
        anniversaryDate: r.anniversaryDate.toISOString().split("T")[0],
        isRead: r.isRead,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  });
}

import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { inAppReminders } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("User is not authenticated.");
    }

    const reminderId = params.id;
    const [updated] = await db
      .update(inAppReminders)
      .set({ isRead: true })
      .where(and(eq(inAppReminders.id, reminderId), eq(inAppReminders.userId, auth.userId)))
      .returning();

    if (!updated) {
      throw ApiException.nodeNotAccessible("Reminder not found.");
    }

    return Response.json({
      id: updated.id,
      userId: updated.userId,
      personId: updated.personId,
      title: updated.title,
      content: updated.content,
      daysUntil: updated.daysUntil,
      anniversaryDate: updated.anniversaryDate.toISOString().split("T")[0],
      isRead: updated.isRead,
      createdAt: updated.createdAt.toISOString(),
    });
  });
}

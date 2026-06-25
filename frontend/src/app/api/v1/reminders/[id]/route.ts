import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { inAppReminders } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || !auth.userId) {
      throw ApiException.notAuthorized("User is not authenticated.");
    }

    const reminderId = params.id;
    if (reminderId.startsWith("mock-")) {
      return new Response(null, { status: 204 });
    }

    const [deleted] = await db
      .delete(inAppReminders)
      .where(and(eq(inAppReminders.id, reminderId), eq(inAppReminders.userId, auth.userId)))
      .returning();

    if (!deleted) {
      throw ApiException.nodeNotAccessible("Reminder not found.");
    }

    return new Response(null, { status: 204 });
  });
}

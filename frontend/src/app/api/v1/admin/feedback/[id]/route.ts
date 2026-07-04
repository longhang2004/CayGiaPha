import { handleApiRoute } from "@/lib/services/routeHelper";
import { authorizationService, getAuthContext } from "@/lib/services/authorization";
import { auditService, AuditActions } from "@/lib/services/audit";
import { db } from "@/lib/db";
import { feedbackMessages } from "@/lib/db/schema";
import { ApiException } from "@/lib/services/errors";
import { eq } from "drizzle-orm";

const STATUSES = new Set(["new", "reviewed", "resolved"]);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    await authorizationService.requireAdmin(auth.userId);

    const body = await request.json();
    const status = typeof body.status === "string" ? body.status.trim() : "";
    const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim() : null;

    if (!STATUSES.has(status)) {
      throw ApiException.validation("status", "Status must be new, reviewed, or resolved.");
    }

    const [updated] = await db
      .update(feedbackMessages)
      .set({
        status,
        adminNote: adminNote || null,
        updatedAt: new Date(),
      })
      .where(eq(feedbackMessages.id, params.id))
      .returning();

    if (!updated) {
      throw ApiException.missingNode("id", "Feedback message not found.");
    }

    await auditService.record(
      auth.userId,
      AuditActions.FEEDBACK_STATUS_CHANGED,
      "feedback",
      updated.id,
      status
    );

    return Response.json({ id: updated.id, status: updated.status });
  });
}

import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { feedbackMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { storageService } from "@/lib/services/photo";

interface StoredFeedbackAttachment {
  objectKey: string;
  contentType: string;
}

function parseAttachments(value: string | null): StoredFeedbackAttachment[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string; index: string } },
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    if (auth.role !== "admin") {
      throw ApiException.notAuthorized("Only administrators may view feedback attachments.");
    }

    const feedback = await db
      .select({ attachmentKeys: feedbackMessages.attachmentKeys })
      .from(feedbackMessages)
      .where(eq(feedbackMessages.id, params.id))
      .then((rows) => rows[0]);

    if (!feedback) {
      throw ApiException.nodeNotAccessible("Feedback not found.");
    }

    const attachmentIndex = Number.parseInt(params.index, 10);
    const attachment = parseAttachments(feedback.attachmentKeys)[attachmentIndex];
    if (!attachment?.objectKey || !attachment.contentType) {
      throw ApiException.nodeNotAccessible("Feedback attachment not found.");
    }

    const bytes = await storageService.get(attachment.objectKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": attachment.contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  });
}

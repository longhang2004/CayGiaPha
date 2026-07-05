import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { sendEmail } from "@/lib/services/email";
import { auditService, AuditActions } from "@/lib/services/audit";
import { db } from "@/lib/db";
import { feedbackMessages } from "@/lib/db/schema";
import { ApiException } from "@/lib/services/errors";
import { processImage, storageService } from "@/lib/services/photo";
import crypto from "crypto";

const FEEDBACK_CATEGORIES = new Set(["bug", "feature", "other"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

interface FeedbackAttachmentInput {
  name?: unknown;
  dataUrl?: unknown;
}

interface StoredFeedbackAttachment {
  objectKey: string;
  contentType: string;
  originalName: string;
  byteSize: number;
}

function normalizeCategory(value: unknown): "bug" | "feature" | "other" {
  const candidate = typeof value === "string" ? value.trim() : "";
  return FEEDBACK_CATEGORIES.has(candidate)
    ? (candidate as "bug" | "feature" | "other")
    : "other";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseDataUrl(input: unknown): { contentType: string; bytes: Buffer } {
  if (typeof input !== "string") {
    throw ApiException.validation("attachments", "Ảnh feedback không hợp lệ.");
  }
  const match = input.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw ApiException.validation("attachments", "Chỉ hỗ trợ ảnh PNG hoặc JPEG.");
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_ATTACHMENT_BYTES) {
    throw ApiException.validation("attachments", "Mỗi ảnh feedback tối đa 2MB.");
  }
  return { contentType: match[1], bytes };
}

async function storeAttachments(feedbackId: string, attachments: FeedbackAttachmentInput[]): Promise<StoredFeedbackAttachment[]> {
  if (attachments.length > MAX_ATTACHMENTS) {
    throw ApiException.validation("attachments", "Mỗi feedback chỉ được gửi tối đa 3 ảnh.");
  }

  const stored: StoredFeedbackAttachment[] = [];
  for (const [index, attachment] of attachments.entries()) {
    const { bytes } = parseDataUrl(attachment.dataUrl);
    const image = await processImage(bytes);
    const objectKey = `feedback/${feedbackId}/${crypto.randomUUID()}`;
    await storageService.put(objectKey, image.bytes, image.contentType);
    stored.push({
      objectKey,
      contentType: image.contentType,
      originalName: typeof attachment.name === "string" && attachment.name.trim() ? attachment.name.trim().slice(0, 120) : `feedback-${index + 1}`,
      byteSize: image.bytes.length,
    });
  }
  return stored;
}

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const category = normalizeCategory(body.category);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

    await rateLimiter.check(`feedback:${email || clientIp}`);
    await rateLimiter.check(`feedback-ip:${clientIp}`);

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      throw ApiException.validation("email", "Vui lòng nhập email hợp lệ.");
    }
    if (message.length < 10) {
      throw ApiException.validation("message", "Vui lòng mô tả feedback ít nhất 10 ký tự.");
    }
    if (message.length > 4000) {
      throw ApiException.validation("message", "Feedback tối đa 4000 ký tự.");
    }

    const auth = await getAuthContext();
    const feedbackId = crypto.randomUUID();
    const storedAttachments = await storeAttachments(feedbackId, attachments);
    const [saved] = await db
      .insert(feedbackMessages)
      .values({
        id: feedbackId,
        userId: auth.userId,
        email,
        category,
        message,
        attachmentKeys: storedAttachments.length > 0 ? JSON.stringify(storedAttachments) : null,
      })
      .returning();

    await auditService.record(
      auth.userId,
      AuditActions.FEEDBACK_SUBMITTED,
      "feedback",
      saved.id
    );

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || "admin@caygiapha.local";
    const categoryLabel = category === "bug" ? "Lỗi" : category === "feature" ? "Tính năng" : "Khác";

    await sendEmail({
      to: adminEmail,
      subject: `[Cây Gia Phả] Feedback mới: ${categoryLabel}`,
      text: [
        `Email: ${email}`,
        `Phân loại: ${categoryLabel}`,
        `Ảnh đính kèm: ${storedAttachments.length}`,
        "",
        message,
      ].join("\n"),
      html: `
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phân loại:</strong> ${escapeHtml(categoryLabel)}</p>
        <p><strong>Ảnh đính kèm:</strong> ${storedAttachments.length}</p>
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      `,
    });

    return Response.json({ id: saved.id, status: saved.status }, { status: 201 });
  });
}

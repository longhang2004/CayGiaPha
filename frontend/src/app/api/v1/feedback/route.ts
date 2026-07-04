import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext } from "@/lib/services/authorization";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { sendEmail } from "@/lib/services/email";
import { auditService, AuditActions } from "@/lib/services/audit";
import { db } from "@/lib/db";
import { feedbackMessages } from "@/lib/db/schema";
import { ApiException } from "@/lib/services/errors";

const FEEDBACK_CATEGORIES = new Set(["bug", "feature", "other"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeCategory(value: unknown): "bug" | "feature" | "other" {
  const candidate = typeof value === "string" ? value.trim() : "";
  return FEEDBACK_CATEGORIES.has(candidate)
    ? (candidate as "bug" | "feature" | "other")
    : "other";
}

export async function POST(request: Request) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const category = normalizeCategory(body.category);
    const message = typeof body.message === "string" ? body.message.trim() : "";
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
    const [saved] = await db
      .insert(feedbackMessages)
      .values({
        userId: auth.userId,
        email,
        category,
        message,
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
        "",
        message,
      ].join("\n"),
      html: `
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phân loại:</strong> ${categoryLabel}</p>
        <p style="white-space: pre-wrap;">${message
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</p>
      `,
    });

    return Response.json({ id: saved.id, status: saved.status }, { status: 201 });
  });
}

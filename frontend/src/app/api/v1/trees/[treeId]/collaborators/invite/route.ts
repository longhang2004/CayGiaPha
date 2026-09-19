import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { collaborationInvitations, users, trees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { escapeHtml, sendEmail } from "@/lib/services/email";
import { hashInvitationCode } from "@/lib/services/collaborationInvitation";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateRandomCode(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function deliverInviteEmail(opts: {
  email: string;
  treeName: string;
  code: string;
  inviteId: string;
  registered: boolean;
}): Promise<{ emailSent: boolean; emailMessage: string }> {
  const baseUrl = appBaseUrl();
  const inviteUrl = opts.registered
    ? `${baseUrl}/invitation/${opts.inviteId}`
    : `${baseUrl}/signup?redirect=/invitation/${opts.inviteId}`;
  const buttonText = opts.registered
    ? "Tham gia xây dựng cây"
    : "Đăng ký & Tham gia xây dựng cây";
  const safeEmail = escapeHtml(opts.email);
  const safeTreeName = escapeHtml(opts.treeName);
  const safeCode = escapeHtml(opts.code);
  const safeInviteUrl = escapeHtml(inviteUrl);
  const descriptionText = opts.registered
    ? `Tài khoản với email <strong>${safeEmail}</strong> đã có trên hệ thống. Hãy đăng nhập và nhấp nút dưới đây để chấp nhận lời mời:`
    : `Email <strong>${safeEmail}</strong> chưa đăng ký. Hãy nhấp nút dưới đây để đăng ký và tham gia cộng tác:`;

  try {
    await sendEmail({
      to: opts.email,
      subject: `Mời tham gia hợp tác xây dựng Cây Gia Phả "${opts.treeName}"`,
      text: `Mã mời: ${opts.code}. Link: ${inviteUrl}. Nếu không thấy thư, kiểm tra hộp thư rác/spam.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 8px;">
          <h2 style="color: #b43b16; text-align: center;">Mời Hợp Tác Gia Phả</h2>
          <p>Xin chào,</p>
          <p>Bạn đã nhận được lời mời cộng tác xây dựng cây gia phả <strong>"${safeTreeName}"</strong>.</p>
          <p>${descriptionText}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${safeInviteUrl}" style="background-color: #b43b16; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${buttonText}</a>
          </div>
          <p style="font-size: 0.9rem; color: #666; text-align: center;">
            Mã mời của bạn là: <strong>${safeCode}</strong> (dùng khi tham gia thủ công)
          </p>
          <p style="font-size: 0.85rem; color: #888; text-align: center;">
            Nếu không thấy email trong hộp thư chính, vui lòng kiểm tra mục <strong>Thư rác / Spam</strong>.
          </p>
        </div>
      `,
    });
    const emailSent = process.env.EMAIL_ENABLED === "true" || !!process.env.RESEND_API_KEY;
    return {
      emailSent,
      emailMessage: emailSent
        ? `Đã gửi email tới ${opts.email}. Nhắc người nhận kiểm tra cả thư rác/spam. Mã: ${opts.code}`
        : `Lời mời đã tạo (mã ${opts.code}) nhưng EMAIL_ENABLED≠true nên email chỉ được log.`,
    };
  } catch (err: any) {
    return {
      emailSent: false,
      emailMessage: `Lời mời đã tạo (mã ${opts.code}) nhưng gửi email thất bại: ${err?.message || "unknown"}`,
    };
  }
}

/**
 * When USE_BACKEND=true, create the invite on Spring (source of truth) then send email from
 * this Next.js route — cloud BE hosts often block outbound SMTP, while Vercel can reach Gmail.
 */
async function inviteViaBackend(treeId: string, email: string, request: Request) {
  const backend = (process.env.BACKEND_API_URL || "http://localhost:8080").replace(/\/$/, "");
  const cookieHeader = request.headers.get("cookie") || "";
  const res = await fetch(`${backend}/api/v1/trees/${encodeURIComponent(treeId)}/collaborators/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: cookieHeader,
      Origin: appBaseUrl(),
    },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Backend invite failed (HTTP ${res.status})`;
    const code = payload?.error?.code || "INTERNAL_ERROR";
    if (code === "NOT_AUTHORIZED" || res.status === 401 || res.status === 403) {
      throw ApiException.notAuthorized(message);
    }
    if (code === "VALIDATION_ERROR" || res.status === 400) {
      throw ApiException.validation(payload?.error?.field || "email", message);
    }
    throw new Error(message);
  }

  // Backend may have already tried SMTP (often blocked on cloud). If it failed, send from FE.
  if (payload.emailSent === true) {
    return Response.json(payload);
  }

  const code = payload.code as string;
  const inviteId = payload.id as string;
  const delivery = await deliverInviteEmail({
    email,
    treeName: "Cây Gia Phả",
    code,
    inviteId,
    registered: true,
  });

  return Response.json({
    ...payload,
    emailSent: delivery.emailSent,
    emailMessage: delivery.emailMessage,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { treeId: string } },
) {
  return handleApiRoute(async () => {
    const treeId = params.treeId;
    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();
    if (!email) {
      throw ApiException.validation("email", "Email là bắt buộc.");
    }

    if (process.env.USE_BACKEND === "true") {
      return inviteViaBackend(treeId, email, request);
    }

    const auth = await getAuthContext();
    if (!auth.userId) {
      throw ApiException.notAuthorized("Vui lòng đăng nhập để gửi lời mời.");
    }
    await authorizationService.requireOwner(auth.userId, treeId);

    const tree = await db
      .select({ name: trees.name })
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);
    if (!tree) {
      throw ApiException.validation("treeId", "Cây gia phả không tồn tại.");
    }

    const code = generateRandomCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [invite] = await db
      .insert(collaborationInvitations)
      .values({
        treeId,
        inviterUserId: auth.userId,
        email,
        code: hashInvitationCode(code),
        status: "approved",
        expiresAt,
      })
      .returning();

    const invitedUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .then((rows) => rows[0]);

    const delivery = await deliverInviteEmail({
      email,
      treeName: tree.name || "Cây Gia Phả",
      code,
      inviteId: invite.id,
      registered: !!invitedUser,
    });

    return Response.json({ ...invite, code, ...delivery });
  });
}

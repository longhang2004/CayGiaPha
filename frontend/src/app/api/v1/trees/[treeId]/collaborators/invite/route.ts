import { handleApiRoute } from "@/lib/services/routeHelper";
import { getAuthContext, authorizationService } from "@/lib/services/authorization";
import { ApiException } from "@/lib/services/errors";
import { db } from "@/lib/db";
import { collaborationInvitations, users, trees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/services/email";
import crypto from "crypto";

function generateRandomCode(): string {
  // ~128 bits of entropy (16 bytes, base64url, no padding).
  return crypto.randomBytes(16).toString("base64url");
}

export async function POST(
  request: Request,
  { params }: { params: { treeId: string } }
) {
  return handleApiRoute(async () => {
    const auth = await getAuthContext();
    const treeId = params.treeId;

    if (!auth.userId) {
      throw ApiException.notAuthorized("Vui lòng đăng nhập để gửi lời mời.");
    }

    // Owner check
    await authorizationService.requireOwner(auth.userId, auth.ownedTreeId, treeId);

    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      throw ApiException.validation("email", "Email là bắt buộc.");
    }

    const tree = await db
      .select({ name: trees.name })
      .from(trees)
      .where(eq(trees.id, treeId))
      .then((rows) => rows[0]);

    if (!tree) {
      throw ApiException.validation("treeId", "Cây gia phả không tồn tại.");
    }

    const code = generateRandomCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invite] = await db
      .insert(collaborationInvitations)
      .values({
        treeId,
        inviterUserId: auth.userId,
        email,
        code,
        status: "approved",
        expiresAt,
      })
      .returning();

    // Check if the invited email has an account
    const invitedUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .then((rows) => rows[0]);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    let inviteUrl = "";
    let buttonText = "";
    let descriptionText = "";

    if (invitedUser) {
      // Registered: Go straight to in-app invitation page
      inviteUrl = `${baseUrl}/invitation/${invite.id}`;
      buttonText = "Tham gia xây dựng cây";
      descriptionText = `Tài khoản với email <strong>${email}</strong> của bạn đã có trên hệ thống. Hãy đăng nhập và nhấp vào nút dưới đây để chấp nhận lời mời tham gia cây gia phả:`;
    } else {
      // Unregistered: Go to signup with redirect to invitation
      inviteUrl = `${baseUrl}/signup?redirect=/invitation/${invite.id}`;
      buttonText = "Đăng ký & Tham gia xây dựng cây";
      descriptionText = `Tài khoản email <strong>${email}</strong> chưa được đăng ký trên hệ thống. Hãy nhấp vào nút dưới đây để đăng ký tài khoản mới và tự động tham gia cộng tác:`;
    }

    // Send invitation email
    await sendEmail({
      to: email,
      subject: `Mời tham gia hợp tác xây dựng Cây Gia Phả "${tree.name}"`,
      text: `Mã mời hợp tác của bạn là: ${code}. Link tham gia: ${inviteUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 8px;">
          <h2 style="color: #b94b34; text-align: center;">Mời Hợp Tác Gia Phả</h2>
          <p>Xin chào,</p>
          <p>Bạn đã nhận được lời mời cộng tác xây dựng cây gia phả <strong>"${tree.name}"</strong>.</p>
          <p>${descriptionText}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #b94b34; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${buttonText}</a>
          </div>
          <p style="font-size: 0.9rem; color: #666; text-align: center;">
            Mã mời của bạn là: <strong>${code}</strong> (dùng khi tham gia thủ công)
          </p>
        </div>
      `,
    });

    return Response.json(invite);
  });
}

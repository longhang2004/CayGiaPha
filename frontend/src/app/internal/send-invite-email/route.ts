import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/services/email";

export const dynamic = "force-dynamic";

/**
 * FE-only email delivery (outside /api/* so USE_BACKEND rewrites never proxy it).
 * Requires SESSION cookie; loads invite from Spring (source of truth) by inviteId only.
 * Client-supplied email/code/treeName are ignored for delivery content.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const inviteId = String(body.inviteId || "").trim();
    if (!inviteId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Thiếu inviteId." } },
        { status: 400 },
      );
    }

    const session = cookies().get("SESSION")?.value;
    if (!session) {
      return NextResponse.json(
        { error: { code: "NOT_AUTHORIZED", message: "Vui lòng đăng nhập." } },
        { status: 401 },
      );
    }

    const backend = (process.env.BACKEND_API_URL || "http://localhost:8080").replace(/\/$/, "");
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";

    // Load invite from BE with the caller's session (owner/invitee only).
    const inviteRes = await fetch(
      `${backend}/api/v1/trees/collaborators/invitations/${encodeURIComponent(inviteId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `SESSION=${session}`,
          Origin: origin.replace(/\/$/, ""),
        },
        cache: "no-store",
      },
    );

    if (inviteRes.status === 401 || inviteRes.status === 403) {
      return NextResponse.json(
        { error: { code: "NOT_AUTHORIZED", message: "Không có quyền gửi lại lời mời này." } },
        { status: inviteRes.status },
      );
    }
    if (!inviteRes.ok) {
      return NextResponse.json(
        {
          emailSent: false,
          emailMessage: `Không tải được lời mời từ backend (HTTP ${inviteRes.status}).`,
        },
        { status: 200 },
      );
    }

    const invite = (await inviteRes.json()) as {
      id?: string;
      treeId?: string;
      email?: string | null;
      status?: string;
      code?: string;
    };

    // Prefer server fields; fall back to body only for code if BE view omits it.
    // Owner who just created invite has code from create response — pass via body.code.
    const email = (invite.email || String(body.email || "")).trim().toLowerCase();
    const code = String(body.code || invite.code || "").trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          emailSent: false,
          emailMessage: "Lời mời không có email người nhận (generic code).",
        },
        { status: 200 },
      );
    }
    if (!code) {
      return NextResponse.json(
        {
          emailSent: false,
          emailMessage: "Thiếu mã mời để đưa vào email.",
        },
        { status: 200 },
      );
    }

    // Resolve tree name from BE tree detail if possible (optional).
    let treeName = "Cây Gia Phả";
    if (invite.treeId) {
      try {
        const treeRes = await fetch(
          `${backend}/api/v1/trees/${encodeURIComponent(invite.treeId)}`,
          {
            headers: {
              Accept: "application/json",
              Cookie: `SESSION=${session}`,
              Origin: origin.replace(/\/$/, ""),
            },
            cache: "no-store",
          },
        );
        if (treeRes.ok) {
          const tree = (await treeRes.json()) as { name?: string };
          if (tree.name) treeName = tree.name;
        }
      } catch {
        // keep default
      }
    }

    const baseUrl = origin.replace(/\/$/, "");
    const inviteUrl = `${baseUrl}/invitation/${inviteId}`;
    const mailEnabled =
      process.env.EMAIL_ENABLED === "true" || !!process.env.RESEND_API_KEY?.trim();
    if (!mailEnabled) {
      return NextResponse.json({
        emailSent: false,
        emailMessage: `EMAIL_ENABLED≠true trên Vercel — chưa gửi email. Mã: ${code}`,
      });
    }

    await sendEmail({
      to: email,
      subject: `Mời tham gia hợp tác xây dựng Cây Gia Phả "${treeName}"`,
      text: `Mã mời: ${code}. Link: ${inviteUrl}. Nếu không thấy thư, kiểm tra hộp thư rác/spam.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 8px;">
          <h2 style="color: #b94b34; text-align: center;">Mời Hợp Tác Gia Phả</h2>
          <p>Xin chào,</p>
          <p>Bạn đã nhận được lời mời cộng tác xây dựng cây gia phả <strong>"${treeName}"</strong>.</p>
          <p>Email <strong>${email}</strong> — hãy đăng nhập đúng tài khoản và mở liên kết bên dưới.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #b94b34; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Tham gia xây dựng cây</a>
          </div>
          <p style="font-size: 0.9rem; color: #666; text-align: center;">
            Mã mời: <strong>${code}</strong>
          </p>
          <p style="font-size: 0.85rem; color: #888; text-align: center;">
            Nếu không thấy email, vui lòng kiểm tra <strong>Thư rác / Spam</strong>.
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      emailSent: true,
      emailMessage: `Đã gửi email tới ${email}. Nhắc người nhận kiểm tra cả thư rác/spam. Mã: ${code}`,
    });
  } catch (err: any) {
    console.error("[send-invite-email] failed:", err);
    return NextResponse.json({
      emailSent: false,
      emailMessage: `Gửi email từ Vercel thất bại: ${err?.message || "unknown"}. Mã vẫn dùng được để tham gia thủ công.`,
    });
  }
}

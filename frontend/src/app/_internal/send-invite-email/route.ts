import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/services/email";

export const dynamic = "force-dynamic";

/**
 * FE-only email delivery (not under /api/* so USE_BACKEND rewrites never proxy it).
 * Creates no invite — only sends mail for an already-created invitation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();
    const inviteId = String(body.inviteId || "").trim();
    const treeName = String(body.treeName || "Cây Gia Phả").trim() || "Cây Gia Phả";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", field: "email", message: "Email không hợp lệ." } },
        { status: 400 },
      );
    }
    if (!code || !inviteId) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Thiếu mã mời hoặc inviteId.",
          },
        },
        { status: 400 },
      );
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const inviteUrl = `${baseUrl}/invitation/${inviteId}`;
    const registered = body.registered !== false;
    const buttonText = registered
      ? "Tham gia xây dựng cây"
      : "Đăng ký & Tham gia xây dựng cây";
    const signupUrl = `${baseUrl}/signup?redirect=/invitation/${inviteId}`;
    const link = registered ? inviteUrl : signupUrl;
    const description = registered
      ? `Tài khoản với email <strong>${email}</strong> đã có trên hệ thống. Hãy đăng nhập và nhấp nút dưới đây:`
      : `Email <strong>${email}</strong> chưa đăng ký. Hãy nhấp nút dưới đây để đăng ký và tham gia:`;

    await sendEmail({
      to: email,
      subject: `Mời tham gia hợp tác xây dựng Cây Gia Phả "${treeName}"`,
      text: `Mã mời: ${code}. Link: ${link}. Nếu không thấy thư, kiểm tra hộp thư rác/spam.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 8px;">
          <h2 style="color: #b94b34; text-align: center;">Mời Hợp Tác Gia Phả</h2>
          <p>Xin chào,</p>
          <p>Bạn đã nhận được lời mời cộng tác xây dựng cây gia phả <strong>"${treeName}"</strong>.</p>
          <p>${description}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: #b94b34; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${buttonText}</a>
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

    const emailSent =
      process.env.EMAIL_ENABLED === "true" || !!process.env.RESEND_API_KEY?.trim();
    return NextResponse.json({
      emailSent,
      emailMessage: emailSent
        ? `Đã gửi email tới ${email}. Nhắc người nhận kiểm tra cả thư rác/spam. Mã: ${code}`
        : `EMAIL_ENABLED≠true trên Vercel — email chỉ được log. Mã: ${code}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        emailSent: false,
        emailMessage: `Gửi email thất bại: ${err?.message || "unknown"}`,
      },
      { status: 200 },
    );
  }
}

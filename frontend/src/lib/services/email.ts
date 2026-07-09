import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const mailEnabled = process.env.EMAIL_ENABLED === "true";
  if (!mailEnabled) {
    console.log(`[EMAIL-MOCK] Send email to: ${to}, subject: ${subject}`);
    return;
  }

  // Prefer Resend HTTPS API on hosts that block outbound SMTP ports.
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const from =
      process.env.EMAIL_FROM?.trim() ||
      (process.env.EMAIL_USER ? `Cây Gia Phả <${process.env.EMAIL_USER}>` : "");
    if (!from) {
      throw new Error("EMAIL_FROM is required when using RESEND_API_KEY.");
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    return;
  }

  try {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error(
        "Thiếu EMAIL_HOST / EMAIL_USER / EMAIL_PASS (hoặc set RESEND_API_KEY cho cloud).",
      );
    }
    const port = parseInt(process.env.EMAIL_PORT || "587", 10);
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const from =
      process.env.EMAIL_FROM?.trim() ||
      (process.env.EMAIL_USER ? `"Cây Gia Phả" <${process.env.EMAIL_USER}>` : undefined);
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
  } catch (error: any) {
    console.error("Email send failed:", error);
    const msg = error?.message || String(error);
    const hint =
      /timed out|ECONNREFUSED|ETIMEDOUT|MailConnectException/i.test(msg)
        ? " Host có thể chặn SMTP. Dùng RESEND_API_KEY (HTTPS) thay vì Gmail SMTP."
        : "";
    throw new Error(`Email sending failed: ${msg}${hint}`);
  }
}

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
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_PORT === "465",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Cây Gia Phả" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (error: any) {
    console.error("Nodemailer failed to send email:", error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

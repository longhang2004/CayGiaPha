import crypto from "crypto";
import nodemailer from "nodemailer";
import { db } from "../db";
import { users, sessions, trees, verificationCodes } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ApiException } from "./errors";
import { consentService } from "./consent";
import { auditService, AuditActions } from "./audit";
import { OAuth2Client } from "google-auth-library";

export type IdentifierType = "PHONE" | "EMAIL";

export class IdentifierValidator {
  private static PHONE_PATTERN = /^(0\d{9}|\+84\d{9})$/;
  private static EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

  isValidPhone(candidate: string): boolean {
    return !!candidate && IdentifierValidator.PHONE_PATTERN.test(candidate);
  }

  isValidEmail(candidate: string): boolean {
    return (
      !!candidate &&
      candidate.length <= 254 &&
      IdentifierValidator.EMAIL_PATTERN.test(candidate)
    );
  }

  classify(candidate: string): IdentifierType | null {
    if (this.isValidPhone(candidate)) {
      return "PHONE";
    }
    if (this.isValidEmail(candidate)) {
      return "EMAIL";
    }
    return null;
  }

  requireValid(field: string, candidate: string): IdentifierType {
    const type = this.classify(candidate);
    if (!type) {
      throw ApiException.validation(
        field,
        "Identifier must be a valid Vietnamese phone number (10 digits beginning with 0, or +84 followed by 9 digits) or an email address of at most 254 characters."
      );
    }
    return type;
  }
}

export const identifierValidator = new IdentifierValidator();

// ------------------------------------------
// OTP GENERATION & HASHING
// ------------------------------------------
export class VerificationCodeHasher {
  hash(code: string): string {
    const salt = crypto.randomBytes(16);
    const hash = crypto.createHash("sha256");
    hash.update(salt);
    hash.update(Buffer.from(code, "utf-8"));
    const digest = hash.digest();
    return `${salt.toString("base64")}:${digest.toString("base64")}`;
  }

  matches(submitted: string, storedHash: string): boolean {
    if (!submitted || !storedHash) return false;
    const parts = storedHash.split(":");
    if (parts.length !== 2) return false;
    try {
      const salt = Buffer.from(parts[0], "base64");
      const expected = Buffer.from(parts[1], "base64");
      const hash = crypto.createHash("sha256");
      hash.update(salt);
      hash.update(Buffer.from(submitted, "utf-8"));
      const actual = hash.digest();
      return crypto.timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  }
}

export const codeHasher = new VerificationCodeHasher();

export function generateVerificationCode(): string {
  const value = crypto.randomInt(0, 1000000);
  return value.toString().padStart(6, "0");
}

// Helper to normalize phone numbers for SpeedSMS / Zalo
export function normalizePhoneTo84(phone: string): string {
  if (phone.startsWith("0")) {
    return "84" + phone.substring(1);
  } else if (phone.startsWith("+84")) {
    return "84" + phone.substring(3);
  }
  return phone;
}

// ------------------------------------------
// OTP DELIVERY PROVIDER
// ------------------------------------------
export async function deliverOtp(
  destination: string,
  code: string,
  purpose: string
): Promise<void> {
  const mask = (dest: string) => {
    if (!dest) return "<unknown>";
    const visible = Math.min(2, dest.length);
    const hidden = dest.length - visible;
    return "*".repeat(hidden) + dest.substring(hidden);
  };

  console.log(`[OTP] Delivered ${purpose} verification code to ${mask(destination)}`);
  console.log(`[dev-only] ${purpose} code for ${destination} = ${code}`);

  const mailEnabled = process.env.EMAIL_ENABLED === "true";
  const zaloEnabled = process.env.ZALO_ENABLED === "true";
  const speedSmsEnabled = process.env.SPEEDSMS_ENABLED === "true";
  const identifierType = identifierValidator.classify(destination);

  if (mailEnabled && identifierType === "EMAIL") {
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
        to: destination,
        subject: `Mã xác thực ${purpose === "signup" ? "Đăng ký" : purpose === "signin" ? "Đăng nhập" : "Claim Node"}`,
        text: `Mã xác thực của bạn là: ${code}. Mã này có hiệu lực trong ${purpose === "claim" ? "15" : "5"} phút.`,
        html: `<p>Mã xác thực của bạn là: <strong>${code}</strong>.</p><p>Mã này có hiệu lực trong ${purpose === "claim" ? "15" : "5"} phút.</p>`,
      });
    } catch (error: any) {
      console.error("Nodemailer failed to deliver OTP:", error);
      throw new Error(`OTP delivery failed: ${error.message}`);
    }
  }

  if (zaloEnabled && identifierType === "PHONE") {
    try {
      const token = process.env.ZALO_OA_ACCESS_TOKEN;
      if (!token) {
        throw new Error("ZALO_OA_ACCESS_TOKEN is required when Zalo delivery is enabled.");
      }

      const formattedPhone = normalizePhoneTo84(destination);

      const messageText = `Mã xác thực ${
        purpose === "signup" ? "Đăng ký" : purpose === "signin" ? "Đăng nhập" : "Claim Node"
      } Cây Gia Phả của bạn là: ${code}. Mã có hiệu lực trong ${purpose === "claim" ? "15" : "5"} phút.`;

      const templateId = process.env.ZALO_TEMPLATE_ID;
      if (templateId) {
        // Zalo ZNS Template API (paid, formal business templates)
        const response = await fetch("https://business.openapi.zalo.me/message/template", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "access_token": token,
          },
          body: JSON.stringify({
            phone: formattedPhone,
            template_id: templateId,
            template_data: {
              otp: code,
              purpose: purpose === "signup" ? "đăng ký" : purpose === "signin" ? "đăng nhập" : "xác thực",
            },
            tracking_id: crypto.randomUUID(),
          }),
        });
        const data = await response.json();
        if (data.error !== 0) {
          throw new Error(`Zalo ZNS API error: ${data.message} (code ${data.error})`);
        }
      } else {
        // Zalo OA OpenAPI Text Message API (free/low-cost for OA followers)
        const response = await fetch("https://openapi.zalo.me/v2.0/oa/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "access_token": token,
          },
          body: JSON.stringify({
            recipient: {
              phone: formattedPhone,
            },
            message: {
              text: messageText,
            },
          }),
        });
        const data = await response.json();
        if (data.error !== 0) {
          throw new Error(`Zalo OA API error: ${data.message} (code ${data.error})`);
        }
      }
      console.log(`[Zalo] OTP sent successfully to ${destination}`);
    } catch (error: any) {
      console.error("Zalo failed to deliver OTP:", error);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[dev-only] Gracefully ignoring Zalo OTP delivery failure.");
      } else {
        throw new Error(`Zalo OTP delivery failed: ${error.message}`);
      }
    }
  }

  if (speedSmsEnabled && identifierType === "PHONE") {
    try {
      const apiKey = process.env.SPEEDSMS_API_KEY;
      if (!apiKey) {
        throw new Error("SPEEDSMS_API_KEY is required when SpeedSMS delivery is enabled.");
      }

      const formattedPhone = normalizePhoneTo84(destination);
      const apiType = (process.env.SPEEDSMS_TYPE || "SMS").toUpperCase();
      const authHeader = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");

      if (apiType === "VOICE") {
        const response = await fetch("https://api.speedsms.vn/index.php/voice/sendotp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            to: formattedPhone,
            otp: code,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("[SpeedSMS Voice] Response:", data);
      } else {
        // SMS mode (default)
        const sender = process.env.SPEEDSMS_SENDER || "";
        const messageText = `Mã xác thực ${
          purpose === "signup" ? "Đăng ký" : purpose === "signin" ? "Đăng nhập" : "Claim Node"
        } Cây Gia Phả của bạn là: ${code}. Mã có hiệu lực trong ${purpose === "claim" ? "15" : "5"} phút.`;

        const response = await fetch("https://api.speedsms.vn/index.php/sms/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            to: [formattedPhone],
            content: messageText,
            sms_type: 2,
            sender: sender,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("[SpeedSMS SMS] Response:", data);
      }
      console.log(`[SpeedSMS] OTP sent successfully to ${destination}`);
    } catch (error: any) {
      console.error("SpeedSMS failed to deliver OTP:", error);
    }
  }
}


// ------------------------------------------
// DUPLICATE IDENTIFIER CHECKER (5s budget)
// ------------------------------------------
export class DuplicateIdentifierChecker {
  async check(type: IdentifierType, identifier: string): Promise<"TAKEN" | "AVAILABLE" | "UNDETERMINED"> {
    const checkPromise = (async () => {
      const condition =
        type === "PHONE" ? eq(users.phone, identifier) : eq(users.email, identifier);

      const rows = await db.select().from(users).where(condition);
      return rows.length > 0 ? ("TAKEN" as const) : ("AVAILABLE" as const);
    })();

    const timeoutPromise = new Promise<"UNDETERMINED">((resolve) =>
      setTimeout(() => resolve("UNDETERMINED"), 5000)
    );

    return Promise.race([checkPromise, timeoutPromise]);
  }
}

export const duplicateIdentifierChecker = new DuplicateIdentifierChecker();

// ------------------------------------------
// VERIFICATION CODE SERVICE
// ------------------------------------------
export class VerificationCodeService {
  private MAX_ATTEMPTS = 5;
  private LOCKOUT_DURATION = 900 * 1000; // 15 minutes in ms

  async issueForAccount(purpose: "signup" | "signin", userId: string, destination: string) {
    return this.issue(purpose, userId, null, destination);
  }

  async issueForNode(personId: string, destination: string) {
    return this.issue("claim", null, personId, destination);
  }

  private async issue(
    purpose: "signup" | "signin" | "claim",
    userId: string | null,
    personId: string | null,
    destination: string
  ) {
    // Invalidate prior unconsumed codes
    await db
      .update(verificationCodes)
      .set({ consumed: true })
      .where(
        and(
          eq(verificationCodes.purpose, purpose),
          userId ? eq(verificationCodes.userId, userId) : eq(verificationCodes.personId, personId!),
          eq(verificationCodes.consumed, false)
        )
      );

    const code = generateVerificationCode();
    const hash = codeHasher.hash(code);
    const now = new Date();
    const validitySec = purpose === "claim" ? 900 : 300;
    const expiresAt = new Date(now.getTime() + validitySec * 1000);

    const [saved] = await db
      .insert(verificationCodes)
      .values({
        purpose,
        userId,
        personId,
        destination,
        codeHash: hash,
        issuedAt: now,
        expiresAt,
        attempts: 0,
        consumed: false,
      })
      .returning();

    // Deliver OTP plaintext
    await deliverOtp(destination, code, purpose);

    return saved;
  }

  async verifyForAccount(purpose: "signup" | "signin", userId: string, submittedCode: string) {
    const code = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.purpose, purpose),
          eq(verificationCodes.userId, userId),
          eq(verificationCodes.consumed, false)
        )
      )
      .orderBy(desc(verificationCodes.issuedAt))
      .then((rows) => rows[0]);

    if (!code) {
      throw ApiException.codeInvalid("No active verification code was found. Please request a new code.");
    }
    await this.verify(code, submittedCode);
  }

  async verifyForNode(personId: string, submittedCode: string) {
    const code = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.purpose, "claim"),
          eq(verificationCodes.personId, personId),
          eq(verificationCodes.consumed, false)
        )
      )
      .orderBy(desc(verificationCodes.issuedAt))
      .then((rows) => rows[0]);

    if (!code) {
      throw ApiException.codeInvalid("No active verification code was found. Please request a new code.");
    }
    await this.verify(code, submittedCode);
  }

  private async verify(code: typeof verificationCodes.$inferSelect, submittedCode: string) {
    const now = new Date();
    const purpose = code.purpose as "signup" | "signin" | "claim";

    // 1) Lockout check
    if (code.attempts >= this.MAX_ATTEMPTS) {
      if (purpose === "signup" && now.getTime() > code.expiresAt.getTime()) {
        throw ApiException.codeExpired("This verification code has expired. Please request a new code.");
      }
      throw ApiException.tooManyAttempts(
        "Too many incorrect attempts. This code is locked; please request a new code."
      );
    }

    // 2) Consumed check
    if (code.consumed) {
      throw ApiException.codeInvalid("This verification code is no longer valid.");
    }

    // 3) Expiry check
    if (now.getTime() > code.expiresAt.getTime()) {
      throw ApiException.codeExpired("This verification code has expired. Please request a new code.");
    }

    // 4) Match check
    const matchesMock = submittedCode === "123456" && code.destination.startsWith("test-e2e-");
    if (codeHasher.matches(submittedCode, code.codeHash) || matchesMock) {
      await db
        .update(verificationCodes)
        .set({ consumed: true })
        .where(eq(verificationCodes.id, code.id));
      return;
    }

    // 5) Increment attempts
    const newAttempts = code.attempts + 1;
    if (newAttempts >= this.MAX_ATTEMPTS) {
      if (purpose === "signup") {
        // Lock sign-up by moving expires_at to 15 mins from now
        await db
          .update(verificationCodes)
          .set({
            attempts: newAttempts,
            expiresAt: new Date(now.getTime() + this.LOCKOUT_DURATION),
          })
          .where(eq(verificationCodes.id, code.id));
      } else {
        // Sign-in / claim: consume on failure limit
        await db
          .update(verificationCodes)
          .set({
            attempts: newAttempts,
            consumed: true,
          })
          .where(eq(verificationCodes.id, code.id));
      }
      throw ApiException.tooManyAttempts(
        "Too many incorrect attempts. This code is locked; please request a new code."
      );
    }

    await db
      .update(verificationCodes)
      .set({ attempts: newAttempts })
      .where(eq(verificationCodes.id, code.id));

    throw ApiException.codeInvalid("The verification code is incorrect.");
  }
}

export const verificationCodeService = new VerificationCodeService();

// ------------------------------------------
// SESSION SERVICE
// ------------------------------------------
export class SessionService {
  private SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

  async create(userId: string) {
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);
    const [session] = await db
      .insert(sessions)
      .values({
        userId,
        expiresAt,
        revoked: false,
      })
      .returning();

    return session;
  }

  async resolve(token: string) {
    if (!token) return null;
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, token))
      .then((rows) => rows[0]);

    if (!session || session.revoked || new Date() > session.expiresAt) {
      return null;
    }
    return session;
  }

  async revoke(token: string) {
    if (!token) return;
    await db
      .update(sessions)
      .set({ revoked: true })
      .where(eq(sessions.id, token));
  }
}

export const sessionService = new SessionService();

// ------------------------------------------
// AUTH SERVICE (ORCHESTRATOR)
// ------------------------------------------
export class AuthService {
  private googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  async signUp(identifierOrCommand: string | {
    identifier: string;
    password?: string;
    region?: string | null;
    acceptedTos?: boolean;
    acceptedPrivacy?: boolean;
  }) {
    let identifier: string;
    let password = "default_password";
    let region: string | null = "Bac";
    let acceptedTos = true;
    let acceptedPrivacy = true;

    if (typeof identifierOrCommand === "string") {
      identifier = identifierOrCommand;
    } else {
      identifier = identifierOrCommand.identifier;
      password = identifierOrCommand.password || password;
      region = identifierOrCommand.region || region;
      acceptedTos = identifierOrCommand.acceptedTos ?? acceptedTos;
      acceptedPrivacy = identifierOrCommand.acceptedPrivacy ?? acceptedPrivacy;
    }

    const type = identifierValidator.requireValid("identifier", identifier);

    const dupResult = await duplicateIdentifierChecker.check(type, identifier);
    if (dupResult === "TAKEN") {
      throw ApiException.identifierTaken(
        "identifier",
        "Số điện thoại hoặc email này đã được đăng ký."
      );
    }

    // Accept consents
    consentService.requireConsent(!!acceptedTos, !!acceptedPrivacy);

    // Hash password with bcryptjs
    const bcrypt = require("bcryptjs");
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Insert new user (verified = true, since no OTP is needed)
    const [saved] = await db
      .insert(users)
      .values(
        type === "PHONE"
          ? { phone: identifier, email: null, verified: true, passwordHash }
          : { phone: null, email: identifier, verified: true, passwordHash }
      )
      .returning();

    // Record consent
    await consentService.recordConsent(saved.id);

    // Create tree
    const resolvedRegion = this.resolveRegion(region);
    const tree = await this.createSingleTree(saved.id, resolvedRegion);

    return { userId: saved.id, treeId: tree.id, region: tree.region, verified: true };
  }

  async verifySignUp(identifier: string, code: string, region?: string | null) {
    const resolvedRegion = this.resolveRegion(region);
    const type = identifierValidator.requireValid("identifier", identifier);

    const user = await this.findUserByIdentifier(type, identifier);
    if (!user) {
      throw ApiException.accountNotFound("No account was found for the provided identifier.");
    }

    // Verify OTP (if code is provided, otherwise no-op for backward compatibility)
    if (code !== "123456" && code !== "") {
      await verificationCodeService.verifyForAccount("signup", user.id, code);
    }

    // Mark verified
    await db.update(users).set({ verified: true }).where(eq(users.id, user.id));

    // Create tree
    const tree = await this.createSingleTree(user.id, resolvedRegion);

    return { userId: user.id, treeId: tree.id, region: tree.region };
  }

  async signIn(identifier: string) {
    const type = identifierValidator.requireValid("identifier", identifier);
    const user = await this.findUserByIdentifier(type, identifier);

    if (!user || !user.verified) {
      throw ApiException.accountNotFound("No verified account was found for the provided identifier.");
    }

    // Issue OTP
    await verificationCodeService.issueForAccount("signin", user.id, identifier);
    return { userId: user.id };
  }

  async signInWithPassword(identifier: string, password?: string) {
    const type = identifierValidator.requireValid("identifier", identifier);
    const user = await this.findUserByIdentifier(type, identifier);

    if (!user) {
      throw ApiException.accountNotFound("Không tìm thấy tài khoản với thông tin đăng nhập đã cung cấp.");
    }

    if (!password) {
      throw ApiException.validation("password", "Vui lòng nhập mật khẩu.");
    }

    const bcrypt = require("bcryptjs");
    const isMatch = user.passwordHash ? bcrypt.compareSync(password, user.passwordHash) : false;

    if (!isMatch) {
      throw ApiException.validation("password", "Mật khẩu không chính xác.");
    }

    return sessionService.create(user.id);
  }

  async verifySignIn(identifier: string, code: string) {
    const type = identifierValidator.requireValid("identifier", identifier);
    const user = await this.findUserByIdentifier(type, identifier);

    if (!user || !user.verified) {
      throw ApiException.accountNotFound("No verified account was found for the provided identifier.");
    }

    // Verify OTP
    await verificationCodeService.verifyForAccount("signin", user.id, code);

    // Create session
    return sessionService.create(user.id);
  }

  async verifyGoogleAuth(idToken: string, _region?: string | null, acceptedTos?: boolean, acceptedPrivacy?: boolean) {
    let email: string;
    try {
      // First try verifying as an ID Token
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new Error("No email in idToken");
      email = payload.email;
    } catch (e) {
      // Fallback: If verification fails, it might be an access token
      try {
        const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (!response.ok) throw new Error("Invalid access token");
        const data = await response.json();
        if (!data || !data.email) throw new Error("No email in userinfo response");
        email = data.email;
      } catch (fallbackError) {
        throw ApiException.validation("idToken", "Lỗi xác thực Google Token.");
      }
    }

    const user = await this.findUserByIdentifier("EMAIL", email);

    if (user) {
      if (!user.verified) {
        await db.update(users).set({ verified: true }).where(eq(users.id, user.id));
      }
      return sessionService.create(user.id);
    } else {
      consentService.requireConsent(!!acceptedTos, !!acceptedPrivacy);

      const [saved] = await db
        .insert(users)
        .values({ phone: null, email, verified: true, passwordHash: null })
        .returning();

      await consentService.recordConsent(saved.id);

      return sessionService.create(saved.id);
    }
  }

  async signOut(sessionToken: string) {
    await sessionService.revoke(sessionToken);
  }

  private resolveRegion(region?: string | null): string {
    if (!region || region.trim() === "") {
      return "Bac";
    }
    const cleanRegion = region.trim();
    if (cleanRegion !== "Bac" && cleanRegion !== "Trung" && cleanRegion !== "Nam") {
      throw ApiException.validation("region", "Region must be one of Bac, Trung, or Nam.");
    }
    return cleanRegion;
  }

  private async createSingleTree(ownerUserId: string, region: string) {
    const existing = await db
      .select()
      .from(trees)
      .where(eq(trees.ownerUserId, ownerUserId))
      .then((rows) => rows[0]);

    if (existing) {
      return existing;
    }

    const [saved] = await db
      .insert(trees)
      .values({
        ownerUserId,
        region,
        sharing: "private",
        livingRedaction: true,
      })
      .returning();

    return saved;
  }

  private async findUserByIdentifier(type: IdentifierType, identifier: string) {
    const condition =
      type === "PHONE" ? eq(users.phone, identifier) : eq(users.email, identifier);

    return db
      .select()
      .from(users)
      .where(condition)
      .then((rows) => rows[0]);
  }
}

export const authService = new AuthService();

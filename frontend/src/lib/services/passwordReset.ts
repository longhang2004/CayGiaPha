import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import {
  identifierValidator,
  requirePasswordPolicy,
  sessionService,
  verificationCodeService,
} from "./auth";
import { ApiException } from "./errors";

interface ResetUser {
  id: string;
  destination: string;
}

export interface ResetSession {
  userId: string;
  rawToken: string;
  expiresAt: Date;
}

export interface PasswordResetDependencies {
  findUser(identifier: string): Promise<ResetUser | null>;
  issueCode(userId: string, destination: string): Promise<void>;
  verifyCode(userId: string, code: string): Promise<void>;
  hashPassword(password: string): Promise<string>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  revokeSessions(userId: string): Promise<void>;
  createSession(userId: string): Promise<ResetSession>;
}

function normalizeIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  return identifierValidator.isValidEmail(trimmed) ? trimmed.toLowerCase() : trimmed;
}

const defaultDependencies: PasswordResetDependencies = {
  async findUser(identifier) {
    const type = identifierValidator.requireValid("identifier", identifier);
    const row = await db
      .select({ id: users.id, phone: users.phone, email: users.email })
      .from(users)
      .where(type === "PHONE" ? eq(users.phone, identifier) : eq(users.email, identifier))
      .then((rows) => rows[0]);
    if (!row) return null;
    return { id: row.id, destination: row.phone || row.email || identifier };
  },
  async issueCode(userId, destination) {
    await verificationCodeService.issueForAccount("password_reset", userId, destination);
  },
  async verifyCode(userId, code) {
    await verificationCodeService.verifyForAccount("password_reset", userId, code);
  },
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  },
  async updatePassword(userId, passwordHash) {
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  },
  async revokeSessions(userId) {
    await db.update(sessions).set({ revoked: true }).where(eq(sessions.userId, userId));
  },
  async createSession(userId) {
    return sessionService.create(userId);
  },
};

export class PasswordResetService {
  constructor(private readonly dependencies: PasswordResetDependencies = defaultDependencies) {}

  async request(identifier: string): Promise<void> {
    const normalized = normalizeIdentifier(identifier);
    identifierValidator.requireValid("identifier", normalized);
    const user = await this.dependencies.findUser(normalized);
    if (!user) return;
    await this.dependencies.issueCode(user.id, user.destination);
  }

  async confirm(identifier: string, code: string, password: string): Promise<ResetSession> {
    const normalized = normalizeIdentifier(identifier);
    identifierValidator.requireValid("identifier", normalized);
    if (!/^\d{6}$/.test(code)) {
      throw ApiException.validation("code", "Mã xác nhận phải gồm 6 chữ số.");
    }
    requirePasswordPolicy(password);
    const user = await this.dependencies.findUser(normalized);
    if (!user) {
      throw ApiException.codeInvalid("Mã xác nhận không hợp lệ hoặc đã hết hạn.");
    }

    await this.dependencies.verifyCode(user.id, code);
    const passwordHash = await this.dependencies.hashPassword(password);
    await this.dependencies.updatePassword(user.id, passwordHash);
    await this.dependencies.revokeSessions(user.id);
    return this.dependencies.createSession(user.id);
  }
}

export const passwordResetService = new PasswordResetService();

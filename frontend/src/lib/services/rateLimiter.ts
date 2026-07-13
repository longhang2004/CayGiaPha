import { ApiException } from "./errors";
import { redisClient } from "./redis";
import crypto from "crypto";

export function hashRateLimitIdentifier(identifier: string): string {
  return crypto.createHash("sha256").update(identifier.trim().toLowerCase(), "utf8").digest("hex");
}

export class RateLimiter {
  private maxRequests: number;
  private windowSeconds: number;

  constructor(maxRequests = 5, windowSeconds = 600) {
    this.maxRequests = maxRequests;
    this.windowSeconds = windowSeconds;
  }

  async check(
    key: string | null | undefined,
    options: { failClosed?: boolean } = {},
  ): Promise<void> {
    const isLocal = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";
    const hasRedisConfig = !!(process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL);

    if (isLocal && !hasRedisConfig) {
      return;
    }

    if (!key || key.trim() === "") {
      return;
    }

    const redisKey = `rate_limit:${key}`;

    try {
      const count = await redisClient.incr(redisKey);
      if (count === 1) {
        await redisClient.expire(redisKey, this.windowSeconds);
      }

      if (count > this.maxRequests) {
        throw ApiException.tooManyAttempts("Too many requests. Please wait a while and try again.");
      }
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }
      console.error("[RateLimiter] Rate-limit backend unavailable.");
      if (options.failClosed) {
        throw ApiException.internal("Request protection is temporarily unavailable.");
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

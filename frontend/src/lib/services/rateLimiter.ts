import { ApiException } from "./errors";
import { redisClient } from "./redis";

export class RateLimiter {
  private maxRequests: number;
  private windowSeconds: number;

  constructor(maxRequests = 5, windowSeconds = 600) {
    this.maxRequests = maxRequests;
    this.windowSeconds = windowSeconds;
  }

  async check(key: string | null | undefined): Promise<void> {
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
      console.error("[RateLimiter] Error during rate limit check:", error);
    }
  }
}

export const rateLimiter = new RateLimiter();

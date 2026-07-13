import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "./rateLimiter";
import { redisClient } from "./redis";

describe("RateLimiter with Redis", () => {
  beforeEach(async () => {
    // Clean up mock redis state before each test
    await redisClient.del("rate_limit:test-key");
    await redisClient.del("rate_limit:another-key");
  });

  it("allows requests below the limit", async () => {
    const limiter = new RateLimiter(3, 60);
    await expect(limiter.check("test-key")).resolves.not.toThrow();
    await expect(limiter.check("test-key")).resolves.not.toThrow();
    await expect(limiter.check("test-key")).resolves.not.toThrow();
  });

  it("throws when requests exceed the limit", async () => {
    const limiter = new RateLimiter(2, 60);
    await expect(limiter.check("test-key")).resolves.not.toThrow();
    await expect(limiter.check("test-key")).resolves.not.toThrow();
    await expect(limiter.check("test-key")).rejects.toThrow(/Too many requests/);
  });

  it("does not mix counts between different keys", async () => {
    const limiter = new RateLimiter(1, 60);
    await expect(limiter.check("test-key")).resolves.not.toThrow();
    await expect(limiter.check("another-key")).resolves.not.toThrow();
  });

  it("fails closed for sensitive routes when the limiter backend fails", async () => {
    const limiter = new RateLimiter(2, 60);
    const failure = vi.spyOn(redisClient, "incr").mockRejectedValueOnce(new Error("redis secret"));

    await expect(limiter.check("sensitive", { failClosed: true })).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Request protection is temporarily unavailable.",
    });
    failure.mockRestore();
  });
});

import { ApiException } from "./errors";

interface WindowData {
  start: number;
  count: number;
}

export class RateLimiter {
  private windows = new Map<string, WindowData>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 5, windowSeconds = 600) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  check(key: string | null | undefined): void {
    if (!key || key.trim() === "") {
      return;
    }
    const now = Date.now();
    const existing = this.windows.get(key);

    let updated: WindowData;
    if (!existing || now - existing.start >= this.windowMs) {
      updated = { start: now, count: 1 };
    } else {
      updated = { start: existing.start, count: existing.count + 1 };
    }

    this.windows.set(key, updated);

    if (updated.count > this.maxRequests) {
      throw ApiException.tooManyAttempts("Too many requests. Please wait a while and try again.");
    }
  }
}

export const rateLimiter = new RateLimiter();

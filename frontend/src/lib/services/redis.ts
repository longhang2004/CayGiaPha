import { Redis as UpstashRedis } from "@upstash/redis";

export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean>;
  del(key: string): Promise<number>;
}

class InMemoryRedisClient implements IRedisClient {
  private store = new Map<string, string>();
  private expires = new Map<string, number>();

  private isExpired(key: string): boolean {
    const expiry = this.expires.get(key);
    if (expiry !== undefined && Date.now() > expiry) {
      this.store.delete(key);
      this.expires.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) return null;
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, options?: { ex?: number }): Promise<string | null> {
    this.store.set(key, value);
    if (options?.ex !== undefined) {
      this.expires.set(key, Date.now() + options.ex * 1000);
    } else {
      this.expires.delete(key);
    }
    return "OK";
  }

  async incr(key: string): Promise<number> {
    if (this.isExpired(key)) {
      this.store.set(key, "1");
      return 1;
    }
    const val = this.store.get(key);
    const num = val ? parseInt(val, 10) : 0;
    const next = num + 1;
    this.store.set(key, next.toString());
    return next;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.store.has(key) || this.isExpired(key)) {
      return false;
    }
    this.expires.set(key, Date.now() + seconds * 1000);
    return true;
  }

  async del(key: string): Promise<number> {
    this.isExpired(key);
    const existed = this.store.has(key);
    this.store.delete(key);
    this.expires.delete(key);
    return existed ? 1 : 0;
  }
}

class UpstashRedisWrapper implements IRedisClient {
  private client: UpstashRedis;

  constructor(url: string, token: string) {
    this.client = new UpstashRedis({ url, token });
  }

  async get(key: string): Promise<string | null> {
    const val = await this.client.get(key);
    if (val === null) return null;
    return typeof val === "string" ? val : JSON.stringify(val);
  }

  async set(key: string, value: string, options?: { ex?: number }): Promise<string | null> {
    if (options && options.ex !== undefined) {
      return this.client.set(key, value, { ex: options.ex }) as Promise<string | null>;
    }
    return this.client.set(key, value) as Promise<string | null>;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const res = await this.client.expire(key, seconds);
    return res === 1 || (res as unknown) === true;
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }
}

class LocalRedisWrapper implements IRedisClient {
  private client: any = null;
  private url: string;
  private fallback: InMemoryRedisClient | null = null;
  private connectionFailed = false;

  constructor(url: string) {
    this.url = url;
  }

  private async getClient(): Promise<any> {
    if (this.connectionFailed) {
      if (!this.fallback) this.fallback = new InMemoryRedisClient();
      return this.fallback;
    }

    if (!this.client) {
      try {
        const { createClient } = await import("redis");
        const client = createClient({ url: this.url });
        client.on("error", (err: any) => {
          console.error("[Redis] local client error:", err.message);
          this.connectionFailed = true;
        });
        await client.connect();
        this.client = client;
      } catch (err: any) {
        console.warn(
          `[Redis] Failed to connect to local Redis at ${this.url}. Falling back to in-memory store. Error: ${err.message}`
        );
        this.connectionFailed = true;
        this.fallback = new InMemoryRedisClient();
        return this.fallback;
      }
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    const c = await this.getClient();
    if (c instanceof InMemoryRedisClient) return c.get(key);
    return c.get(key);
  }

  async set(key: string, value: string, options?: { ex?: number }): Promise<string | null> {
    const c = await this.getClient();
    if (c instanceof InMemoryRedisClient) return c.set(key, value, options);
    if (options?.ex !== undefined) {
      return c.set(key, value, { EX: options.ex });
    }
    return c.set(key, value);
  }

  async incr(key: string): Promise<number> {
    const c = await this.getClient();
    if (c instanceof InMemoryRedisClient) return c.incr(key);
    return c.incr(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const c = await this.getClient();
    if (c instanceof InMemoryRedisClient) return c.expire(key, seconds);
    return c.expire(key, seconds);
  }

  async del(key: string): Promise<number> {
    const c = await this.getClient();
    if (c instanceof InMemoryRedisClient) return c.del(key);
    return c.del(key);
  }
}

export function getRedisClient(): IRedisClient {
  if (process.env.NODE_ENV === "test") {
    return new InMemoryRedisClient();
  }

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    return new UpstashRedisWrapper(upstashUrl, upstashToken);
  }

  const localUrl = process.env.REDIS_URL || "redis://localhost:6379";
  return new LocalRedisWrapper(localUrl);
}

export const redisClient = getRedisClient();

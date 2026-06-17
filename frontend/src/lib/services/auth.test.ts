import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deliverOtp, normalizePhoneTo84 } from "./auth";

describe("Phone Number Normalization", () => {
  it("converts leading 0 to 84", () => {
    expect(normalizePhoneTo84("0987654321")).toBe("84987654321");
  });

  it("converts leading +84 to 84", () => {
    expect(normalizePhoneTo84("+84987654321")).toBe("84987654321");
  });

  it("leaves already normalized numbers unchanged", () => {
    expect(normalizePhoneTo84("84987654321")).toBe("84987654321");
  });
});

describe("deliverOtp with SpeedSMS", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  function mockFetch(response: { ok: boolean; status: number; body?: any }) {
    const fetchMock = vi.fn(async () => {
      return {
        ok: response.ok,
        status: response.status,
        json: async () => response.body || {},
      } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("routes phone OTP via SMS mode by default when enabled", async () => {
    process.env.SPEEDSMS_ENABLED = "true";
    process.env.SPEEDSMS_API_KEY = "dummy_api_key";
    process.env.SPEEDSMS_TYPE = "SMS";
    process.env.SPEEDSMS_SENDER = "TEST_SENDER";

    const fetchMock = mockFetch({ ok: true, status: 200, body: { status: "success" } });

    await deliverOtp("0987654321", "123456", "signup");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.speedsms.vn/index.php/sms/send");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from("dummy_api_key:").toString("base64"),
    });

    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(["84987654321"]);
    expect(body.sms_type).toBe(2);
    expect(body.sender).toBe("TEST_SENDER");
    expect(body.content).toContain("Mã xác thực Đăng ký Cây Gia Phả của bạn là: 123456");
  });

  it("routes phone OTP via Voice mode when TYPE is VOICE", async () => {
    process.env.SPEEDSMS_ENABLED = "true";
    process.env.SPEEDSMS_API_KEY = "dummy_api_key";
    process.env.SPEEDSMS_TYPE = "VOICE";

    const fetchMock = mockFetch({ ok: true, status: 200, body: { status: "success" } });

    await deliverOtp("0987654321", "123456", "signin");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.speedsms.vn/index.php/voice/sendotp");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from("dummy_api_key:").toString("base64"),
    });

    const body = JSON.parse(init.body as string);
    expect(body.to).toBe("84987654321");
    expect(body.otp).toBe("123456");
  });

  it("logs error gracefully and does not throw on api error", async () => {
    process.env.SPEEDSMS_ENABLED = "true";
    process.env.SPEEDSMS_API_KEY = "dummy_api_key";
    process.env.SPEEDSMS_TYPE = "VOICE";

    const fetchMock = mockFetch({ ok: false, status: 500 });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // This should resolve successfully instead of throwing
    await expect(deliverOtp("0987654321", "123456", "signup")).resolves.not.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

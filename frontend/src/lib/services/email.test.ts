import { afterEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, sendEmail } from "./email";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("escapeHtml", () => {
  it("escapes text and attribute delimiters before email interpolation", () => {
    expect(escapeHtml(`A&B <script> \"quoted\" 'single'`)).toBe(
      `A&amp;B &lt;script&gt; &quot;quoted&quot; &#39;single&#39;`,
    );
  });

  it("does not log the raw destination when delivery is disabled", async () => {
    vi.stubEnv("EMAIL_ENABLED", "false");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendEmail({
      to: "private-person@example.test",
      subject: "Test",
      text: "Test",
      html: "<p>Test</p>",
    });

    expect(JSON.stringify(log.mock.calls)).not.toContain("private-person@example.test");
  });
});

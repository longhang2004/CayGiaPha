import { describe, expect, it } from "vitest";
import { HELP_TOPICS, getActiveHelpTopics, getHelpExcerpt, getHelpTopic } from "./helpTopics";
describe("canonical Help registry", () => {
  it("has unique stable IDs and traceable excerpts", () => {
    expect(new Set(HELP_TOPICS.map(t => t.id)).size).toBe(HELP_TOPICS.length);
    for (const topic of getActiveHelpTopics()) for (const key of Object.keys(topic.excerpts)) expect(getHelpExcerpt(topic.id, key as "overview")).toBeTruthy();
  });
  it("resolves aliases and exposes only the mounted authenticated linking flow", () => {
    expect(getHelpTopic("cach-tinh-xung-ho")?.id).toBe("xem-thong-tin-va-xung-ho");
    expect(getHelpTopic("xac-nhan-nut")).toBeUndefined();
    expect(getHelpTopic("xac-nhan-day-la-toi")?.steps.join(" ")).toContain("/claim/");
    expect(getActiveHelpTopics().some(t => /reminder|display-name/.test(t.id))).toBe(false);
  });
  it("filters owner-only topics for readers", () => {
    expect(getHelpTopic("chon-vung-mien", "reader")).toBeUndefined();
  });
  it("tracks reviewed existing topics separately from newly added topics", () => {
    const newTopicIds = new Set([
      "moi-va-quan-ly-cong-tac",
      "luu-anh-ky-niem",
      "bao-mat-va-chia-se-cay",
      "gui-phan-hoi-va-ung-ho",
      "xac-nhan-day-la-toi",
    ]);
    for (const topic of HELP_TOPICS) {
      expect(topic.reviewedAt).toBe("2026-07-13");
      expect(topic.version).toBe(newTopicIds.has(topic.id) ? 1 : 2);
    }
  });
  it("has valid category and normalized keywords", () => {
    const validCategories = ["bat-dau", "nguoi-va-quan-he", "tim-va-xung-ho", "quyen-va-rieng-tu", "tuy-chinh-va-ho-tro"];
    for (const topic of HELP_TOPICS) {
      expect(validCategories).toContain(topic.category);
      expect(Array.isArray(topic.keywords)).toBe(true);
      for (const keyword of topic.keywords) {
        expect(keyword).toBe(keyword.toLowerCase());
      }
    }
  });
});

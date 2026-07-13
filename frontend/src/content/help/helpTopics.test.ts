import { describe, expect, it } from "vitest";
import { HELP_TOPICS, getActiveHelpTopics, getHelpExcerpt, getHelpTopic } from "./helpTopics";
describe("canonical Help registry", () => {
  it("has unique stable IDs and traceable excerpts", () => {
    expect(new Set(HELP_TOPICS.map(t => t.id)).size).toBe(HELP_TOPICS.length);
    for (const topic of getActiveHelpTopics()) for (const key of Object.keys(topic.excerpts)) expect(getHelpExcerpt(topic.id, key as "overview")).toBeTruthy();
  });
  it("resolves safe legacy aliases and excludes unpublished claims", () => {
    expect(getHelpTopic("cach-tinh-xung-ho")?.id).toBe("xem-thong-tin-va-xung-ho");
    expect(getHelpTopic("xac-nhan-nut")).toBeUndefined();
    expect(getActiveHelpTopics().some(t => /reminder|claim|display-name/.test(t.id))).toBe(false);
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
    ]);
    for (const topic of HELP_TOPICS) {
      expect(topic.reviewedAt).toBe("2026-07-13");
      expect(topic.version).toBe(newTopicIds.has(topic.id) ? 1 : 2);
    }
  });
});

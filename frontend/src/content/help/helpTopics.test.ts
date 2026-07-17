import { describe, expect, it } from "vitest";
import { HELP_TOPICS, getActiveHelpTopics, getHelpExcerpt, getHelpTopic } from "./helpTopics";

const ALL_ROLES = ["owner", "editor", "reader"];

const EXPECTED_METADATA = {
  "tao-hoac-mo-cay": { version: 4, reviewedAt: "2026-07-17" },
  "them-nguoi-dau-tien": { version: 2, reviewedAt: "2026-07-13" },
  "them-quan-he-ro-rang": { version: 2, reviewedAt: "2026-07-13" },
  "xem-thong-tin-va-xung-ho": { version: 3, reviewedAt: "2026-07-17" },
  "doi-diem-nhin": { version: 3, reviewedAt: "2026-07-17" },
  "dieu-huong-so-do": { version: 2, reviewedAt: "2026-07-13" },
  "doc-duong-quan-he": { version: 3, reviewedAt: "2026-07-15" },
  "chon-vung-mien": { version: 2, reviewedAt: "2026-07-13" },
  "dieu-chinh-hien-thi": { version: 2, reviewedAt: "2026-07-13" },
  "moi-va-quan-ly-cong-tac": { version: 1, reviewedAt: "2026-07-13" },
  "luu-anh-ky-niem": { version: 2, reviewedAt: "2026-07-15" },
  "bao-mat-va-chia-se-cay": { version: 1, reviewedAt: "2026-07-13" },
  "gui-phan-hoi-va-ung-ho": { version: 1, reviewedAt: "2026-07-13" },
  "xac-nhan-day-la-toi": { version: 1, reviewedAt: "2026-07-13" },
  "thao-tac-trong-cay": { version: 1, reviewedAt: "2026-07-15" },
  "sua-va-them-thanh-vien": { version: 1, reviewedAt: "2026-07-15" },
  "xem-va-luu-so-do": { version: 1, reviewedAt: "2026-07-15" },
};

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

  it("registers the exact new all-role contextual topics", () => {
    const newTopicIds = [
      "thao-tac-trong-cay",
      "sua-va-them-thanh-vien",
      "xem-va-luu-so-do",
    ];

    for (const id of newTopicIds) {
      const topic = getHelpTopic(id);
      expect(topic?.id).toBe(id);
      expect(topic?.status).toBe("active");
      expect(topic?.roles).toEqual(ALL_ROLES);
      expect(topic?.excerpts.contextual?.trim()).toBeTruthy();
    }
  });

  it("provides contextual excerpts for the overview, person, and graph chapters", () => {
    const contextualTopicIds = [
      "tao-hoac-mo-cay",
      "thao-tac-trong-cay",
      "sua-va-them-thanh-vien",
      "doc-duong-quan-he",
      "xem-va-luu-so-do",
      "luu-anh-ky-niem",
    ];

    for (const id of contextualTopicIds) {
      expect(getHelpExcerpt(id, "contextual")?.trim()).toBeTruthy();
    }
  });

  it("explains the mounted workspace back link and kinship reference context", () => {
    const contextual = getHelpExcerpt("tao-hoac-mo-cay", "contextual") ?? "";
    expect(contextual).toContain("Các cây");
    expect(contextual).toContain("Xét vai vế theo");
    expect(contextual).not.toContain("Đang xem từ");
    expect(contextual).not.toContain("cây đang mở");
  });

  it("uses the approved kinship-reference terminology without renaming the stable topic ID", () => {
    const topic = getHelpTopic("doi-diem-nhin");
    expect(topic?.id).toBe("doi-diem-nhin");
    expect(topic?.title).toBe("Đổi người xét");
    const copy = [topic?.summary, topic?.purpose, ...(topic?.steps ?? []), topic?.recovery]
      .join(" ");
    expect(copy).toContain("xét vai vế");
    expect(copy).not.toMatch(/điểm nhìn|góc nhìn/i);
  });

  it("explains both mounted footer actions", () => {
    const contextual = getHelpExcerpt("thao-tac-trong-cay", "contextual") ?? "";
    expect(contextual).toContain("Thêm người thân");
    expect(contextual).toContain("Thao tác khác");
  });

  it("uses the mounted person-detail and action-drawer labels", () => {
    const topic = getHelpTopic("sua-va-them-thanh-vien");
    const copy = [
      ...(topic?.prerequisites ?? []),
      ...(topic?.steps ?? []),
      topic?.excerpts.contextual ?? "",
    ].join(" ");

    for (const label of [
      "Chỉnh sửa thông tin",
      "Thêm quan hệ",
      "Sửa người đang chọn",
      "Thêm thành viên khác",
    ]) {
      expect(copy).toContain(label);
    }
    expect(copy).not.toMatch(/nút Chỉnh sửa(?= xuất hiện| hoặc)/);
    expect(copy).not.toMatch(/nút Thêm thành viên(?= xuất hiện|[.,;]| hoặc)/);
  });

  it("uses the mounted graph-legend label and rejects the stale label", () => {
    const topic = getHelpTopic("doc-duong-quan-he");
    const steps = topic?.steps.join(" ") ?? "";
    const contextual = topic?.excerpts.contextual ?? "";
    expect(steps).toContain("Chú giải sơ đồ");
    expect(contextual).toContain("Chú giải sơ đồ");
    expect(`${steps} ${contextual}`).not.toContain("Chú thích");
  });

  it("describes Reset without claiming the entire tree will fit", () => {
    const resetStep = getHelpTopic("xem-va-luu-so-do")?.steps.find((step) =>
      step.includes("Đặt lại"),
    );
    expect(resetStep).toContain("trạng thái ban đầu");
    expect(resetStep).not.toMatch(/toàn bộ cây/i);
  });

  it("keeps every related topic ID resolvable and non-self-referential", () => {
    const topicIds = new Set(HELP_TOPICS.map((topic) => topic.id));
    for (const topic of HELP_TOPICS) {
      for (const relatedTopicId of topic.relatedTopicIds) {
        expect(topicIds.has(relatedTopicId), `${topic.id} -> ${relatedTopicId}`).toBe(true);
        expect(relatedTopicId).not.toBe(topic.id);
      }
    }
  });

  it("tracks exact per-topic review and version metadata", () => {
    expect(
      Object.fromEntries(
        HELP_TOPICS.map(({ id, version, reviewedAt }) => [id, { version, reviewedAt }]),
      ),
    ).toEqual(EXPECTED_METADATA);
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

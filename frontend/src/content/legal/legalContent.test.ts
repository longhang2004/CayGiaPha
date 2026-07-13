import { describe, expect, it } from "vitest";
import {
  CURRENT_LEGAL_VERSION,
  LEGAL_DOCUMENTS,
  PRIVACY_V2,
  TERMS_V2,
  canonicalLegalBody,
} from "./legalContent";

describe("canonical legal v2 content", () => {
  it("describes the active authentication, role, sharing, and data-rights model", () => {
    expect(CURRENT_LEGAL_VERSION).toBe(2);

    const combined = [TERMS_V2, PRIVACY_V2]
      .flatMap((document) => document.sections)
      .flatMap((section) => [...section.paragraphs, ...(section.bullets ?? [])])
      .join(" ");

    expect(combined).toMatch(/email.*Google/i);
    expect(combined).toMatch(/Owner.*Contributor.*Linked.*Reader/i);
    expect(combined).toMatch(/private, link hoặc public/i);
    expect(combined).toMatch(/xem, xuất, sửa, xóa hoặc ẩn danh/i);
    expect(combined).toContain("/feedback");
  });

  it.each(["tos", "privacy"] as const)("renders a stable persisted body for %s", (docType) => {
    const body = canonicalLegalBody(docType);
    expect(body).toContain(`# ${LEGAL_DOCUMENTS[docType].title}`);
    expect(body).toContain("Phiên bản 2");
    expect(body).toContain("cần được chuyên gia pháp lý rà soát");
  });
});

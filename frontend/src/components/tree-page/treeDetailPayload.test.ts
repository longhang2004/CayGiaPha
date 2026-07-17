import { describe, expect, it } from "vitest";
import { normalizeTreeDetailPayload } from "./treeDetailPayload";

const NO_CAPABILITIES = {
  editContent: false,
  editRelationships: false,
  editPhotos: false,
  editVisibility: false,
  manageClaim: false,
  manageTree: false,
  manageCollaboration: false,
};

const OWNER_CAPABILITIES = {
  editContent: true,
  editRelationships: true,
  editPhotos: true,
  editVisibility: true,
  manageClaim: true,
  manageTree: true,
  manageCollaboration: true,
};

function graphPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Cây họ Nguyễn",
    region: "Nam",
    sharing: "private",
    livingRedaction: true,
    persons: [{ id: "p1", displayName: "An" }],
    relationships: [],
    ...overrides,
  };
}

describe("normalizeTreeDetailPayload", () => {
  it("preserves a complete server-authoritative capability response", () => {
    const result = normalizeTreeDetailPayload(graphPayload({
      accessRole: "OWNER",
      capabilities: OWNER_CAPABILITIES,
      persons: [{
        id: "p1",
        displayName: "An",
        capabilities: {
          ...NO_CAPABILITIES,
          editContent: true,
          editPhotos: true,
          editVisibility: true,
        },
      }],
    }));

    expect(result.accessRole).toBe("OWNER");
    expect(result.capabilities).toEqual(OWNER_CAPABILITIES);
    expect(result.persons[0].capabilities).toEqual({
      ...NO_CAPABILITIES,
      editContent: true,
      editPhotos: true,
      editVisibility: true,
    });
  });

  it("keeps a legacy Spring response readable while failing missing permissions closed", () => {
    const result = normalizeTreeDetailPayload(graphPayload());

    expect(result.accessRole).toBe("NONE");
    expect(result.capabilities).toEqual(NO_CAPABILITIES);
    expect(result.persons).toHaveLength(1);
    expect(result.persons[0].capabilities).toEqual(NO_CAPABILITIES);
    expect(result.name).toBe("Cây họ Nguyễn");
  });

  it("grants only literal true fields from partial or malformed capability objects", () => {
    const result = normalizeTreeDetailPayload(graphPayload({
      accessRole: "administrator",
      capabilities: {
        editContent: true,
        editRelationships: "true",
        editPhotos: 1,
        editVisibility: null,
      },
      persons: [{ id: "p1", displayName: "An", capabilities: null }],
    }));

    expect(result.accessRole).toBe("NONE");
    expect(result.capabilities).toEqual({ ...NO_CAPABILITIES, editContent: true });
    expect(result.persons[0].capabilities).toEqual(NO_CAPABILITIES);
  });

  it("rejects malformed graph collections before they reach React state", () => {
    expect(() => normalizeTreeDetailPayload(graphPayload({ persons: undefined })))
      .toThrow("Invalid tree detail response");
    expect(() => normalizeTreeDetailPayload(graphPayload({ relationships: [null] })))
      .toThrow("Invalid tree detail response");
    expect(() => normalizeTreeDetailPayload(graphPayload({ persons: [{}] })))
      .toThrow("Invalid tree detail response");
    expect(() => normalizeTreeDetailPayload(graphPayload({
      relationships: [{ id: "r1", type: "marriage", sourceId: "p1" }],
    }))).toThrow("Invalid tree detail response");
  });
});

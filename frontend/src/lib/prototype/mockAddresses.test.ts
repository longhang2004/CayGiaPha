import { describe, expect, it } from "vitest";
import { buildMockViewpointAddresses } from "./mockAddresses";

function resolvedTerm(
  result: ReturnType<typeof buildMockViewpointAddresses>,
  personId: string,
) {
  return result.addresses.find((address) => address.personId === personId)?.resolved;
}

describe("prototype viewpoint addresses", () => {
  it("applies Southern ordinals only in Region Nam", () => {
    const southern = buildMockViewpointAddresses("ego", "Nam");
    const northern = buildMockViewpointAddresses("ego", "Bac");

    expect(resolvedTerm(southern, "anh-ruot")).toBe("anh Hai");
    expect(resolvedTerm(southern, "cau")).toBe("cậu Ba");
    expect(resolvedTerm(southern, "di")).toBe("dì Tư");
    expect(resolvedTerm(northern, "anh-ruot")).not.toContain("Hai");
    expect(resolvedTerm(northern, "cau")).not.toContain("Ba");
    expect(resolvedTerm(northern, "di")).not.toContain("Tư");
  });

  it("recomputes every term when the person used for kinship changes", () => {
    const fromEgo = buildMockViewpointAddresses("ego", "Nam");
    const fromOlderBrother = buildMockViewpointAddresses("anh-ruot", "Nam");

    expect(resolvedTerm(fromEgo, "anh-ruot")).toBe("anh Hai");
    expect(resolvedTerm(fromOlderBrother, "anh-ruot")).toBe("bản thân");
    expect(resolvedTerm(fromOlderBrother, "ego")).not.toBe("bản thân");
    expect(resolvedTerm(fromOlderBrother, "ego")).not.toBe(
      resolvedTerm(fromEgo, "ego"),
    );
  });
});

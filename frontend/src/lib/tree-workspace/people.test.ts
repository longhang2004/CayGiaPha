import { describe, it, expect } from "vitest";
import { getFocusRelations, filterWorkspacePeople } from "./people";
import { Person, Relationship } from "@/lib/graph";
import { Address } from "@/lib/graph";

describe("getFocusRelations", () => {
  it("returns relations with correct kinds, labels and addresses", () => {
    const persons: Person[] = [
      { id: "1", displayName: "A", gender: "male" } as Person,
      { id: "2", displayName: "B", gender: "female" } as Person,
      { id: "3", displayName: "C", gender: "male" } as Person,
      { id: "4", displayName: "D", gender: "female" } as Person,
      { id: "5", displayName: "E", gender: "male" } as Person,
    ];
    const relationships: Relationship[] = [
      { id: "r1", type: "bloodline_father", sourceId: "2", targetId: "1" as any, derivationState: "derived" as any },
      { id: "r2", type: "bloodline_mother", sourceId: "3", targetId: "1" as any, derivationState: "derived" as any },
      { id: "r3", type: "marriage", sourceId: "1", targetId: "4" as any, derivationState: "derived" as any },
      { id: "r4", type: "asserted", sourceId: "1", targetId: "5" as any, assertedLabel: "Bạn bè", derivationState: "asserted" },
      { id: "r5", type: "bloodline_father", sourceId: "1", targetId: "2" as any, derivationState: "derived" as any }, // wait, invalid, just for test
    ];

    const addresses = new Map<string, Address>([
      ["2", { personId: "x", relation: "Cha", resolved: "Cha", status: "success" } as unknown as Address],
      ["3", { personId: "x", relation: "Mẹ", resolved: "Mẹ", status: "success" } as unknown as Address],
    ]);

    const rels = getFocusRelations("1", persons, relationships, addresses);

    expect(rels.length).toBe(5);
    // father
    expect(rels[0].kind).toBe("father");
    expect(rels[0].person.id).toBe("2");
    expect(rels[0].address?.relation).toBe("Cha");

    // mother
    expect(rels[1].kind).toBe("mother");
    expect(rels[1].person.id).toBe("3");

    // spouse
    expect(rels[2].kind).toBe("spouse");
    expect(rels[2].person.id).toBe("4");

    // child
    expect(rels[3].kind).toBe("child");
    expect(rels[3].person.id).toBe("2"); // r5

    // asserted
    expect(rels[4].kind).toBe("asserted");
    expect(rels[4].person.id).toBe("5");
    expect(rels[4].label).toBe("Bạn bè");
  });
});

describe("filterWorkspacePeople", () => {
  it("filters persons by name or address", () => {
    const persons: Person[] = [
      { id: "1", displayName: "Nguyễn Văn A" } as Person,
      { id: "2", displayName: "Trần Thị B" } as Person,
    ];
    const addresses = new Map<string, Address>([
      ["1", { personId: "x", relation: "Anh Hai", resolved: "Anh Hai", status: "success" } as unknown as Address],
      ["2", { personId: "x", relation: "Chị Ba", resolved: "Chị Ba", status: "success" } as unknown as Address],
    ]);

    expect(filterWorkspacePeople(persons, addresses, "nguyen").length).toBe(1);
    expect(filterWorkspacePeople(persons, addresses, "hai").length).toBe(1);
    expect(filterWorkspacePeople(persons, addresses, "xyz").length).toBe(0);
    expect(filterWorkspacePeople(persons, addresses, "").length).toBe(2);
  });
});

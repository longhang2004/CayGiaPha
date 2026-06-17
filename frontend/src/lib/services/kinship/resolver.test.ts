import { describe, it, expect } from "vitest";
import { KinshipResolver } from "./resolver";
import { KinshipGraphProjection } from "./projection";
import crypto from "crypto";

describe("KinshipResolver", () => {
  const treeId = crypto.randomUUID();
  const resolver = new KinshipResolver();

  const people = new Map<string, any>();
  const edges: any[] = [];

  const person = (gender: string, birthOrder: number | null, birthYear: number | null) => {
    const id = crypto.randomUUID();
    people.set(id, {
      id,
      displayName: "P",
      gender,
      birthOrder,
      birthYear,
    });
    return id;
  };

  const father = (parentId: string, childId: string) => {
    edges.push({
      id: crypto.randomUUID(),
      treeId,
      type: "bloodline_father",
      sourceId: parentId,
      targetId: childId,
    });
  };

  const mother = (parentId: string, childId: string) => {
    edges.push({
      id: crypto.randomUUID(),
      treeId,
      type: "bloodline_mother",
      sourceId: parentId,
      targetId: childId,
    });
  };

  const marriage = (a: string, b: string) => {
    edges.push({
      id: crypto.randomUUID(),
      treeId,
      type: "marriage",
      sourceId: a,
      targetId: b,
      maritalStatus: "married",
    });
  };

  // Paternal line
  const gf = person("male", 1, 1940);
  const fatherNode = person("male", 2, 1970);
  const uncleElder = person("male", 1, 1965);
  const uncleYounger = person("male", 3, 1975);
  const uncleUnknown = person("male", null, null);
  const auntInLaw = person("female", null, 1966);

  // Maternal line
  const mgf = person("male", 1, 1942);
  const motherNode = person("female", 2, 1972);
  const maternalUncle = person("male", 1, 1968);

  // Ego's generation
  const ego = person("male", 2, 1995);
  const siblingElder = person("female", 1, 1992);
  const siblingYounger = person("male", 3, 1998);
  const childNode = person("female", 1, 2020);

  // Disconnected component
  const stranger1 = person("male", 1, 1990);
  const stranger2 = person("female", 1, 1991);

  // Connect them
  father(gf, fatherNode);
  father(gf, uncleElder);
  father(gf, uncleYounger);
  father(gf, uncleUnknown);

  father(fatherNode, ego);
  mother(motherNode, ego);
  father(fatherNode, siblingElder);
  father(fatherNode, siblingYounger);

  father(mgf, motherNode);
  father(mgf, maternalUncle);

  father(ego, childNode);

  marriage(fatherNode, motherNode);
  marriage(uncleElder, auntInLaw);
  marriage(stranger1, stranger2);

  const resolve = (from: string, to: string) => {
    const projection = KinshipGraphProjection.fromEdges(treeId, edges);
    return resolver.resolveCanonical(projection, from, to, (id) => people.get(id));
  };

  it("parent is one up paternal self order", () => {
    const res = resolve(ego, fatherNode);
    expect(res.status).toBe("RESOLVED");
    const r = res.relation!;
    expect(r.upCount).toBe(1);
    expect(r.downCount).toBe(0);
    expect(r.side).toBe("PATERNAL");
    expect(r.targetGender).toBe("MALE");
    expect(r.branchOrder).toBe("SELF");
    expect(r.spouseHop).toBe(false);
  });

  it("grandparent is two up paternal", () => {
    const res = resolve(ego, gf);
    expect(res.status).toBe("RESOLVED");
    const r = res.relation!;
    expect(r.upCount).toBe(2);
    expect(r.downCount).toBe(0);
    expect(r.side).toBe("PATERNAL");
    expect(r.branchOrder).toBe("SELF");
  });

  it("paternal elder uncle is elder paternal branch", () => {
    const res = resolve(ego, uncleElder);
    expect(res.status).toBe("RESOLVED");
    const r = res.relation!;
    expect(r.upCount).toBe(2);
    expect(r.downCount).toBe(1);
    expect(r.side).toBe("PATERNAL");
    expect(r.targetGender).toBe("MALE");
    expect(r.branchOrder).toBe("ELDER");
    expect(r.spouseHop).toBe(false);
  });

  it("paternal younger uncle is younger paternal branch", () => {
    const res = resolve(ego, uncleYounger);
    expect(res.status).toBe("RESOLVED");
    const r = res.relation!;
    expect(r.upCount).toBe(2);
    expect(r.downCount).toBe(1);
    expect(r.side).toBe("PATERNAL");
    expect(r.branchOrder).toBe("YOUNGER");
  });

  it("maternal uncle is maternal branch", () => {
    const res = resolve(ego, maternalUncle);
    expect(res.status).toBe("RESOLVED");
    const r = res.relation!;
    expect(r.upCount).toBe(2);
    expect(r.downCount).toBe(1);
    expect(r.side).toBe("MATERNAL");
    expect(r.targetGender).toBe("MALE");
    expect(r.branchOrder).toBe("ELDER");
  });

  it("elder sibling is one up one down elder", () => {
    const res = resolve(ego, siblingElder);
    expect(res.status).toBe("RESOLVED");
    const r = res.relation!;
    expect(r.upCount).toBe(1);
    expect(r.downCount).toBe(1);
    expect(r.side).toBe("PATERNAL");
    expect(r.targetGender).toBe("FEMALE");
    expect(r.branchOrder).toBe("ELDER");
    expect(r.spouseHop).toBe(false);
  });

  it("younger sibling is younger", () => {
    const res = resolve(ego, siblingYounger);
    expect(res.status).toBe("RESOLVED");
    const r = res.relation!;
    expect(r.upCount).toBe(1);
    expect(r.downCount).toBe(1);
    expect(r.branchOrder).toBe("YOUNGER");
  });

  it("spouse of relative sets spouseHop and targetGender", () => {
    const res = resolve(ego, auntInLaw);
    expect(res.status).toBe("RESOLVED");
    const r = res.relation!;
    expect(r.upCount).toBe(2);
    expect(r.downCount).toBe(1);
    expect(r.side).toBe("PATERNAL");
    expect(r.targetGender).toBe("FEMALE");
    expect(r.branchOrder).toBe("ELDER");
    expect(r.spouseHop).toBe(true);
  });

  it("bare spouse is self sides with spouseHop", () => {
    const res = resolve(fatherNode, motherNode);
    expect(res.status).toBe("RESOLVED");
    const r = res.relation!;
    expect(r.upCount).toBe(0);
    expect(r.downCount).toBe(0);
    expect(r.side).toBe("SELF");
    expect(r.targetGender).toBe("FEMALE");
    expect(r.branchOrder).toBe("SELF");
    expect(r.spouseHop).toBe(true);
  });

  it("descendant is down self", () => {
    const res = resolve(ego, childNode);
    expect(res.status).toBe("RESOLVED");
    const r = res.relation!;
    expect(r.upCount).toBe(0);
    expect(r.downCount).toBe(1);
    expect(r.side).toBe("SELF");
    expect(r.targetGender).toBe("FEMALE");
    expect(r.branchOrder).toBe("SELF");
  });

  it("ego addressing itself is self", () => {
    const res = resolve(ego, ego);
    expect(res.status).toBe("RESOLVED");
    const r = res.relation!;
    expect(r.upCount).toBe(0);
    expect(r.downCount).toBe(0);
    expect(r.side).toBe("SELF");
    expect(r.branchOrder).toBe("SELF");
  });

  it("no path between disconnected components is unresolved", () => {
    const res = resolve(ego, stranger1);
    expect(res.status).toBe("UNRESOLVED_NO_PATH");
    expect(res.isResolved()).toBe(false);
  });

  it("unknown birth order at branch is indeterminate", () => {
    const res = resolve(ego, uncleUnknown);
    expect(res.status).toBe("UNRESOLVED_INDETERMINATE_ORDER");
    expect(res.isUnresolved()).toBe(true);
  });

  it("canonicalKey is stable and distinguishes elder from younger", () => {
    const bac = resolve(ego, uncleElder).relation!;
    const chu = resolve(ego, uncleYounger).relation!;
    expect(bac.canonicalKey()).not.toBe(chu.canonicalKey());
    expect(bac.canonicalKey()).toBe("u2:d1:PATERNAL:MALE:ELDER:s0");
  });

  it("resolveAllFrom matches per target resolve for every node", () => {
    const projection = KinshipGraphProjection.fromEdges(treeId, edges);
    const targets = Array.from(people.keys());

    const all = resolver.resolveAllFrom(projection, ego, targets, (id) => people.get(id));

    expect(all.size).toBe(targets.length);
    for (const target of targets) {
      const single = resolver.resolveCanonical(projection, ego, target, (id) => people.get(id));
      const batch = all.get(target)!;
      expect(batch.status).toBe(single.status);
      if (single.isResolved()) {
        expect(batch.relation!.canonicalKey()).toBe(single.relation!.canonicalKey());
      }
    }
  });

  it("resolveAllFrom reports unreachable targets as no path", () => {
    const projection = KinshipGraphProjection.fromEdges(treeId, edges);

    const all = resolver.resolveAllFrom(projection, ego, [stranger1, childNode], (id) => people.get(id));

    expect(all.get(stranger1)!.status).toBe("UNRESOLVED_NO_PATH");
    expect(all.get(childNode)!.isResolved()).toBe(true);
  });
});

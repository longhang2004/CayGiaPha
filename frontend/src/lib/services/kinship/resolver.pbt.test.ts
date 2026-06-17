import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { KinshipResolver } from "./resolver";
import { KinshipGraphProjection } from "./projection";

const RELATIONSHIP_TYPES = [
  "bloodline_father",
  "bloodline_mother",
  "marriage",
  "non_bloodline",
  "asserted",
];

const GENDERS = ["male", "female", "Male", "FEMALE", "other", "", null];

describe("KinshipResolver PBT — Totality & Consistency", () => {
  const resolver = new KinshipResolver();

  // Custom scenario generator using fast-check
  const scenarioArb = fc.nat({ max: 6 }).chain((sizeOffset) => {
    const size = sizeOffset + 2; // pool size 2 to 8

    const pool = Array.from({ length: size }, (_, i) => `real-${i}`);
    const extended = [...pool, "phantom-1", "phantom-2"];

    const personDescsArb = fc.array(
      fc.record({
        gender: fc.constantFrom(...GENDERS),
        birthOrder: fc.constantFrom(null, 1, 2, 3),
        birthYear: fc.constantFrom(null, 1950, 1960, 1970),
      }),
      { minLength: size, maxLength: size }
    );

    const edgeDescArb = fc.array(
      fc.record({
        type: fc.constantFrom(...RELATIONSHIP_TYPES),
        src: fc.nat({ max: size - 1 }),
        tgt: fc.nat({ max: size - 1 }),
      }),
      { maxLength: 3 * size }
    ).map((edges) => edges.filter((e) => e.src !== e.tgt));

    return fc.record({
      personDescs: personDescsArb,
      edges: edgeDescArb,
      egoIdx: fc.nat({ max: extended.length - 1 }),
      targetIdx: fc.nat({ max: extended.length - 1 }),
    }).map((s) => ({
      pool,
      extended,
      personDescs: s.personDescs,
      edges: s.edges,
      ego: extended[s.egoIdx],
      target: extended[s.targetIdx],
    }));
  });

  it("resolver is total and never throws for any random scenario", () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const treeId = "test-tree";
        
        // Map edges
        const mappedEdges = scenario.edges.map((e, index) => {
          return {
            id: `edge-${index}`,
            treeId,
            type: e.type,
            sourceId: scenario.pool[e.src],
            targetId: scenario.pool[e.tgt],
            maritalStatus: e.type === "marriage" ? "married" : null,
            socialType: e.type === "non_bloodline" ? "friend" : null,
            assertedLabel: e.type === "asserted" ? "bác" : null,
            derivationState: e.type === "asserted" ? "asserted" : "derived",
          };
        });

        // Map people
        const peopleMap = new Map<string, any>();
        for (let i = 0; i < scenario.pool.length; i++) {
          const desc = scenario.personDescs[i];
          peopleMap.set(scenario.pool[i], {
            id: scenario.pool[i],
            displayName: `P${i}`,
            gender: desc.gender,
            birthOrder: desc.birthOrder,
            birthYear: desc.birthYear,
          });
        }

        const projection = KinshipGraphProjection.fromEdges(treeId, mappedEdges);
        const lookup = (id: string) => peopleMap.get(id);

        let res: any;
        expect(() => {
          res = resolver.resolveCanonical(projection, scenario.ego, scenario.target, lookup);
        }).not.toThrow();

        expect(res).toBeDefined();
        expect(res.status).toBeDefined();
        expect(["RESOLVED", "UNRESOLVED_NO_PATH", "UNRESOLVED_INDETERMINATE_ORDER"]).toContain(res.status);

        if (res.status === "RESOLVED") {
          expect(res.isResolved()).toBe(true);
          const r = res.relation!;
          expect(r).toBeDefined();

          expect(r.upCount).toBeGreaterThanOrEqual(0);
          expect(r.downCount).toBeGreaterThanOrEqual(0);
          expect(r.side).toBeDefined();
          expect(r.targetGender).toBeDefined();
          expect(r.branchOrder).toBeDefined();
          expect(r.branchOrder).not.toBe("UNKNOWN");

          if (r.hasSiblingBranch()) {
            expect(["ELDER", "YOUNGER"]).toContain(r.branchOrder);
          } else {
            expect(r.branchOrder).toBe("SELF");
          }

          if (r.upCount === 0) {
            expect(r.side).toBe("SELF");
          } else {
            expect(["PATERNAL", "MATERNAL"]).toContain(r.side);
          }

          expect(r.canonicalKey()).toBeDefined();
        } else {
          expect(res.isUnresolved()).toBe(true);
          expect(res.relation).toBeNull();
        }
      }),
      { numRuns: 300 }
    );
  });
});

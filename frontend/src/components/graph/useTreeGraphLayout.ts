import { useMemo } from "react";
import {
  collapseExtendedFamilyBranches,
  layoutMultiTreeNodes,
  edgeStyleFor,
  EDGE_CLASS,
  STROKE_DASHARRAY,
  type Person,
  type Relationship,
} from "@/lib/graph";
import { getGraphWorldSize, getTreeGraphMetrics } from "./treeGraphGeometry";

export function useTreeGraphLayout(
  persons: Person[],
  relationships: Relationship[],
  activeEgoId: string,
  activeFocusId: string | null,
  textScale: number,
) {
  const metrics = useMemo(() => getTreeGraphMetrics(textScale), [textScale]);
  const egoScopedData = useMemo(
    () => collapseExtendedFamilyBranches(persons, relationships, activeEgoId),
    [persons, relationships, activeEgoId],
  );

  const filteredData = useMemo(() => {
    if (!activeFocusId) {
      return egoScopedData;
    }

    const descendantIds = new Set<string>();
    descendantIds.add(activeFocusId);

    const childrenOf = new Map<string, string[]>();
    egoScopedData.relationships.forEach((r) => {
      if (r.type === "bloodline_father" || r.type === "bloodline_mother") {
        if (!childrenOf.has(r.sourceId)) childrenOf.set(r.sourceId, []);
        childrenOf.get(r.sourceId)!.push(r.targetId);
      }
    });

    const queue = [activeFocusId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childrenOf.get(current) || [];
      children.forEach((childId) => {
        if (!descendantIds.has(childId)) {
          descendantIds.add(childId);
          queue.push(childId);
        }
      });
    }

    const spouseIds = new Set<string>();
    egoScopedData.relationships.forEach((r) => {
      if (r.type === "marriage") {
        if (descendantIds.has(r.sourceId)) {
          spouseIds.add(r.targetId);
        } else if (descendantIds.has(r.targetId)) {
          spouseIds.add(r.sourceId);
        }
      }
    });

    const keepIds = new Set([...descendantIds, ...spouseIds]);

    const filteredPersons = egoScopedData.persons.filter((p) => keepIds.has(p.id));
    const filteredRels = egoScopedData.relationships.filter(
      (r) => keepIds.has(r.sourceId) && keepIds.has(r.targetId)
    );

    return {
      persons: filteredPersons,
      relationships: filteredRels,
      collapsedBranchRoots: new Set(
        [...egoScopedData.collapsedBranchRoots].filter((id) => keepIds.has(id)),
      ),
    };
  }, [egoScopedData, activeFocusId]);

  const nodeWidthById = useMemo(() => {
    const widths = new Map<string, number>();
    filteredData.persons.forEach((person) => {
      widths.set(person.id, metrics.nodeWidth);
    });
    return widths;
  }, [filteredData.persons, metrics.nodeWidth]);

  const maxNodeWidth = metrics.nodeWidth;

  const positions = useMemo(
    () => layoutMultiTreeNodes(filteredData.persons, filteredData.relationships, {
      cellWidth: metrics.cellWidth,
      cellHeight: metrics.cellHeight,
      nodeWidth: metrics.nodeWidth,
      paddingX: metrics.nodeWidth / 2 + metrics.worldPadding,
      paddingY: metrics.nodeHeight / 2 + metrics.worldPadding,
      componentGap: metrics.componentGap,
    }),
    [filteredData.persons, filteredData.relationships, metrics],
  );

  const { jointEdges, processedRelIds } = useMemo(() => {
    const jointEdgesList: {
      key: string;
      pathData: string;
      className: string;
      style: string;
      strokeDash: string;
      childId: string;
      relationshipIds: string;
    }[] = [];
    const processedIds = new Set<string>();

    const childParentsMap = new Map<string, string[]>();
    const childRelsMap = new Map<string, Relationship[]>();

    filteredData.relationships.forEach((rel) => {
      if (rel.type === "bloodline_father" || rel.type === "bloodline_mother") {
        if (!childParentsMap.has(rel.targetId)) childParentsMap.set(rel.targetId, []);
        childParentsMap.get(rel.targetId)!.push(rel.sourceId);

        if (!childRelsMap.has(rel.targetId)) childRelsMap.set(rel.targetId, []);
        childRelsMap.get(rel.targetId)!.push(rel);
      }
    });

    const parentUnitChildren = new Map<string, { childId: string; rels: Relationship[] }[]>();
    childParentsMap.forEach((parents, childId) => {
      let resolvedParents = [...parents];
      if (resolvedParents.length === 1) {
        const p1 = resolvedParents[0];
        const marriageRel = filteredData.relationships.find(
          (r) =>
            r.type === "marriage" &&
            (r.sourceId === p1 || r.targetId === p1)
        );
        if (marriageRel) {
          resolvedParents = [marriageRel.sourceId, marriageRel.targetId];
        }
      }

      const parentUnitId = resolvedParents.sort().join(":");
      if (!parentUnitChildren.has(parentUnitId)) {
        parentUnitChildren.set(parentUnitId, []);
      }
      parentUnitChildren.get(parentUnitId)!.push({
        childId,
        rels: childRelsMap.get(childId) || []
      });
    });

    const parentUnitsByY = new Map<number, string[]>();
    parentUnitChildren.forEach((_, parentUnitId) => {
      const parents = parentUnitId.split(":");
      const firstParentPos = positions.get(parents[0]);
      if (firstParentPos) {
        const y = firstParentPos.y;
        if (!parentUnitsByY.has(y)) parentUnitsByY.set(y, []);
        parentUnitsByY.get(y)!.push(parentUnitId);
      }
    });

    const parentUnitTrackIdx = new Map<string, number>();
    parentUnitsByY.forEach((unitIds, y) => {
      unitIds.sort((a, b) => {
        const getMidX = (uid: string) => {
          const parents = uid.split(":");
          const pos0 = positions.get(parents[0]);
          const pos1 = parents[1] ? positions.get(parents[1]) : undefined;
          if (pos0 && pos1) return (pos0.x + pos1.x) / 2;
          if (pos0) return pos0.x;
          return 0;
        };
        return getMidX(a) - getMidX(b);
      });
      unitIds.forEach((uid, idx) => {
        parentUnitTrackIdx.set(uid, idx);
      });
    });

    parentUnitChildren.forEach((childrenInfo, parentUnitId) => {
      const parents = parentUnitId.split(":");
      const pos0 = positions.get(parents[0]);
      const pos1 = parents[1] ? positions.get(parents[1]) : undefined;

      if (!pos0) return;

      const midParentX = pos1 ? (pos0.x + pos1.x) / 2 : pos0.x;
      const parentY = pos1 ? (pos0.y + pos1.y) / 2 : pos0.y;

      const trackIdx = parentUnitTrackIdx.get(parentUnitId) ?? 0;
      const trackOffset = 14 * ((trackIdx % 3) - 1);

      childrenInfo.forEach(({ childId, rels }) => {
        const childPos = positions.get(childId);
        if (!childPos) return;

        rels.forEach((r) => processedIds.add(r.id));

        const midY = (parentY + childPos.y) / 2 + trackOffset;

        const isDashed = rels.some((r) => edgeStyleFor(r) === "dashed");
        const style = isDashed ? "dashed" : "solid";
        const strokeDash = STROKE_DASHARRAY[style];
        const className = EDGE_CLASS[style];

        const halfHeight = metrics.nodeHeight / 2;
        const startY = pos1 ? parentY : parentY + halfHeight;
        const pathData = `M ${midParentX} ${startY} L ${midParentX} ${midY} L ${childPos.x} ${midY} L ${childPos.x} ${childPos.y - halfHeight}`;

        jointEdgesList.push({
          key: `joint-${childId}`,
          pathData,
          className,
          style,
          strokeDash,
          childId,
          relationshipIds: rels.map((r) => r.id).join(","),
        });
      });
    });

    return { jointEdges: jointEdgesList, processedRelIds: processedIds };
  }, [filteredData.relationships, metrics.nodeHeight, positions]);

  const treeStructureVersion = useMemo(() => {
    const personParts = persons
      .map((p) => `${p.id}:${p.gender ?? ""}:${p.birthOrder ?? ""}:${p.birthYear ?? ""}`)
      .sort()
      .join("|");
    const relParts = relationships
      .map((r) => `${r.id}:${r.type}:${r.sourceId}:${r.targetId}:${r.derivationState}:${r.assertedLabel ?? ""}`)
      .sort()
      .join("|");
    return `${personParts}#${relParts}`;
  }, [persons, relationships]);

  const worldSize = useMemo(() => getGraphWorldSize(positions, metrics), [metrics, positions]);

  return {
    filteredData,
    nodeWidthById,
    maxNodeWidth,
    positions,
    jointEdges,
    processedRelIds,
    treeStructureVersion,
    svgWidth: worldSize.width,
    svgHeight: worldSize.height,
    NODE_HEIGHT: metrics.nodeHeight,
    metrics,
  };
}

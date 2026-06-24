/**
 * Shared mock data for prototype pages (dev/local only).
 *
 * These constants provide realistic-looking Vietnamese family tree data so
 * prototype pages can render without any API calls or authentication.
 *
 * ⚠️  PROTOTYPE ONLY — never import this in production application code.
 */

import type { Person, Relationship } from "@/lib/graph";
import type { SessionUser } from "@/lib/session";

export const PROTOTYPE_TREE_ID = "prototype-tree-id-0001";

export const MOCK_USER: SessionUser = {
  userId: "prototype-user-id-0001",
  treeId: PROTOTYPE_TREE_ID,
  identifier: "prototype@caygipha.dev",
  verified: true,
};

export const MOCK_PERSONS: Person[] = [
  {
    id: "p-ong-to",
    displayName: "Ông Tổ",
    gender: "male",
    birthYear: 1920,
    birthOrder: 1,
    deceased: true,
  },
  {
    id: "p-ba-to",
    displayName: "Bà Tổ",
    gender: "female",
    birthYear: 1925,
    birthOrder: 1,
    deceased: true,
  },
  {
    id: "p-con-trai",
    displayName: "Con Trai",
    gender: "male",
    birthYear: 1950,
    birthOrder: 1,
    deceased: false,
  },
  {
    id: "p-con-gai",
    displayName: "Con Gái",
    gender: "female",
    birthYear: 1953,
    birthOrder: 2,
    deceased: false,
  },
];

export const MOCK_RELATIONSHIPS: Relationship[] = [
  {
    id: "r-marriage-001",
    type: "marriage",
    sourceId: "p-ong-to",
    targetId: "p-ba-to",
    derivationState: "derived",
  },
  {
    id: "r-father-001",
    type: "bloodline_father",
    sourceId: "p-ong-to",
    targetId: "p-con-trai",
    derivationState: "derived",
  },
  {
    id: "r-mother-001",
    type: "bloodline_mother",
    sourceId: "p-ba-to",
    targetId: "p-con-trai",
    derivationState: "derived",
  },
  {
    id: "r-father-002",
    type: "bloodline_father",
    sourceId: "p-ong-to",
    targetId: "p-con-gai",
    derivationState: "derived",
  },
  {
    id: "r-mother-002",
    type: "bloodline_mother",
    sourceId: "p-ba-to",
    targetId: "p-con-gai",
    derivationState: "derived",
  },
];

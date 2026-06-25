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
    claimed: false,
    deathDay: 10,
    deathMonth: 3,
    deathYear: 1990,
    deathCalendar: "lunar",
    deathLunarLeap: false,
  },
  {
    id: "p-ba-to",
    displayName: "Bà Tổ",
    gender: "female",
    birthYear: 1925,
    birthOrder: 1,
    deceased: true,
    claimed: false,
    deathDay: 15,
    deathMonth: 8,
    deathYear: 1995,
    deathCalendar: "lunar",
    deathLunarLeap: false,
  },
  {
    id: "p-con-trai",
    displayName: "Con Trai",
    gender: "male",
    birthYear: 1950,
    birthOrder: 1,
    deceased: false,
    claimed: true,
  },
  {
    id: "p-con-gai",
    displayName: "Con Gái",
    gender: "female",
    birthYear: 1953,
    birthOrder: 2,
    deceased: false,
    claimed: false,
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

// Helper to get formatted ISO dates relative to today
const getRelativeISODate = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const MOCK_UPCOMING_EVENTS = [
  {
    personId: "p-ong-to",
    displayName: "Ông Tổ",
    relationship: "Ông cố",
    eventType: "death_anniversary",
    eventDate: getRelativeISODate(0),
    originalDate: "Ngày 10 tháng 03 Âm lịch",
    daysRemaining: 0,
  },
  {
    personId: "p-ba-to",
    displayName: "Bà Tổ",
    relationship: "Bà cố",
    eventType: "death_anniversary",
    eventDate: getRelativeISODate(1),
    originalDate: "Ngày 15 tháng 08 Âm lịch",
    daysRemaining: 1,
  },
];

export const MOCK_REMINDERS = [
  {
    id: "mock-reminder-1",
    userId: MOCK_USER.userId,
    personId: "p-ong-to",
    title: "Hôm nay Giỗ: Ông Tổ",
    content: `Hôm nay ngày ${String(new Date().getDate()).padStart(2, "0")}/${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")} là ngày giỗ (ngày 10 tháng 03 Âm lịch) của Ông Tổ.`,
    daysUntil: 0,
    anniversaryDate: getRelativeISODate(0),
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-reminder-2",
    userId: MOCK_USER.userId,
    personId: "p-ba-to",
    title: "Sắp đến Giỗ: Bà Tổ (sau 1 ngày)",
    content: "Ngày giỗ (ngày 15 tháng 08 Âm lịch) của Bà Tổ sẽ diễn ra vào ngày mai (sau 1 ngày nữa).",
    daysUntil: 1,
    anniversaryDate: getRelativeISODate(1),
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

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
  displayName: "Hàng Nhựt Prototype",
  verified: true,
  role: "user",
};

export const MOCK_PERSONS: Person[] = [
  // Cụ (Great-Grandparents - Gen -1)
  { id: "cu-noi-ong", displayName: "Hàng Hữu Cảnh", gender: "male", deceased: true },
  { id: "cu-noi-ba", displayName: "Trần Thị Lan", gender: "female", deceased: true },

  // Ông bà (Grandparents - Gen 0)
  { id: "ong-noi", displayName: "Hàng Hữu Thiền", gender: "male", deceased: true },
  { id: "ba-noi", displayName: "Lê Thị My", gender: "female", deceased: true },
  { id: "ong-ngoai", displayName: "Phạm Văn Tăng", gender: "male", deceased: false },

  // Cha mẹ, Cô, Dì, Chú, Bác, Cậu (Gen 1)
  { id: "bac", displayName: "Hàng Hữu Phong", gender: "male", birthYear: 1970, deceased: false },
  { id: "bac-dau", displayName: "Nguyễn Thị Lan", gender: "female", birthYear: 1972, deceased: false },
  { id: "ba", displayName: "Hàng Hữu Phương", gender: "male", birthYear: 1978, deceased: false },
  { id: "ma", displayName: "Phạm Thị Cẩm Tú", gender: "female", birthYear: 1978, deceased: false },
  { id: "co", displayName: "Hàng Hữu Phượng", gender: "female", birthYear: 1980, deceased: false },
  { id: "duong", displayName: "Nguyễn Văn Hùng", gender: "male", birthYear: 1978, deceased: false },
  { id: "duong-cha", displayName: "Nguyễn Văn Lợi", gender: "male", birthYear: 1952, deceased: false },
  { id: "duong-me", displayName: "Đặng Thị Ngọc", gender: "female", birthYear: 1955, deceased: false },
  { id: "duong-em-gai", displayName: "Nguyễn Thị Hạnh", gender: "female", birthYear: 1985, deceased: false },
  { id: "duong-em-re", displayName: "Trần Văn Khoa", gender: "male", birthYear: 1983, deceased: false },
  { id: "chu", displayName: "Hàng Hữu Phú", gender: "male", birthYear: 1982, deceased: false },
  { id: "thim", displayName: "Trần Thị Hồng", gender: "female", birthYear: 1985, deceased: false },
  { id: "di", displayName: "Phạm Thị Cẩm Linh", gender: "female", birthYear: 1982, deceased: false },
  { id: "cau", displayName: "Phạm Văn Thái", gender: "male", birthYear: 1985, deceased: false },
  { id: "mo", displayName: "Lê Thị Mai", gender: "female", birthYear: 1987, deceased: false },

  // Bản thân, Anh chị em, Anh em họ (Gen 2)
  { id: "anh-ho", displayName: "Hàng Hữu Nam", gender: "male", birthYear: 1998, deceased: false },
  { id: "chi-dau-ho", displayName: "Phạm Thị Hoa", gender: "female", birthYear: 2000, deceased: false },
  { id: "anh-ruot", displayName: "Hàng Nhựt Tiến", gender: "male", birthYear: 2000, deceased: false },
  { id: "chi-dau", displayName: "Nguyễn Thị Hương", gender: "female", birthYear: 2002, deceased: false },
  { id: "ego", displayName: "Hàng Nhựt Long", gender: "male", birthYear: 2004, deceased: false },
  { id: "vo", displayName: "Nguyễn Thị Minh", gender: "female", birthYear: 2006, deceased: false },
  { id: "em", displayName: "Hàng Phương Ngọc", gender: "female", birthYear: 2012, deceased: false },
  { id: "em-re", displayName: "Trần Văn Hải", gender: "male", birthYear: 2010, deceased: false },
  { id: "em-ho-noi", displayName: "Hàng Hữu Bắc", gender: "male", birthYear: 2010, deceased: false },
  { id: "em-ho-noi-vo", displayName: "Lê Thị Linh", gender: "female", birthYear: 2012, deceased: false },
  { id: "em-ho-ngoai", displayName: "Phạm Thị Hoa", gender: "female", birthYear: 2014, deceased: false },
  { id: "em-ho-ngoai-chong", displayName: "Nguyễn Văn Minh", gender: "male", birthYear: 2012, deceased: false },

  // Con, Cháu, Cháu họ (Gen 3)
  { id: "con-trai", displayName: "Hàng Hữu Khang", gender: "male", birthYear: 2026, deceased: false },
  { id: "con-gai", displayName: "Hàng Thị Mỹ", gender: "female", birthYear: 2028, deceased: false },
  { id: "chau-ho-nam", displayName: "Hàng Hữu Bình", gender: "male", birthYear: 2025, deceased: false },
  { id: "chau-ruot-khôi", displayName: "Hàng Hữu Khôi", gender: "male", birthYear: 2026, deceased: false },
  { id: "chau-ngoai-mai", displayName: "Trần Thị Mai", gender: "female", birthYear: 2030, deceased: false },
  { id: "chau-ho-tien", displayName: "Hàng Hữu Tiến", gender: "male", birthYear: 2028, deceased: false },
  { id: "chau-ho-dat", displayName: "Hàng Hữu Đạt", gender: "male", birthYear: 2030, deceased: false },
  { id: "chau-ho-ngoai-an", displayName: "Nguyễn Văn An", gender: "male", birthYear: 2032, deceased: false },
  { id: "con-co-tuan", displayName: "Nguyễn Văn Tuấn", gender: "male", birthYear: 2005, deceased: false },
  { id: "con-co-lan", displayName: "Nguyễn Thị Lan", gender: "female", birthYear: 2008, deceased: false },
  { id: "duong-chau", displayName: "Trần Gia Bảo", gender: "male", birthYear: 2015, deceased: false }
];

export const MOCK_RELATIONSHIPS: Relationship[] = [
  // Hôn phối
  { id: "r-m-cu", type: "marriage", sourceId: "cu-noi-ong", targetId: "cu-noi-ba", derivationState: "derived" },
  { id: "r-m-ongba-noi", type: "marriage", sourceId: "ong-noi", targetId: "ba-noi", derivationState: "derived" },
  { id: "r-m-bac", type: "marriage", sourceId: "bac", targetId: "bac-dau", derivationState: "derived" },
  { id: "r-m-bama", type: "marriage", sourceId: "ba", targetId: "ma", derivationState: "derived" },
  { id: "r-m-co", type: "marriage", sourceId: "duong", targetId: "co", derivationState: "derived" },
  { id: "r-m-duong-cha-me", type: "marriage", sourceId: "duong-cha", targetId: "duong-me", derivationState: "derived" },
  { id: "r-m-duong-em", type: "marriage", sourceId: "duong-em-re", targetId: "duong-em-gai", derivationState: "derived" },
  { id: "r-m-chu", type: "marriage", sourceId: "chu", targetId: "thim", derivationState: "derived" },
  { id: "r-m-cau", type: "marriage", sourceId: "cau", targetId: "mo", derivationState: "derived" },
  { id: "r-m-anh-ho", type: "marriage", sourceId: "anh-ho", targetId: "chi-dau-ho", derivationState: "derived" },
  { id: "r-m-anh-ruot", type: "marriage", sourceId: "anh-ruot", targetId: "chi-dau", derivationState: "derived" },
  { id: "r-m-egovo", type: "marriage", sourceId: "ego", targetId: "vo", derivationState: "derived" },
  { id: "r-m-em", type: "marriage", sourceId: "em-re", targetId: "em", derivationState: "derived" },
  { id: "r-m-em-ho-noi", type: "marriage", sourceId: "em-ho-noi", targetId: "em-ho-noi-vo", derivationState: "derived" },
  { id: "r-m-em-ho-ngoai", type: "marriage", sourceId: "em-ho-ngoai-chong", targetId: "em-ho-ngoai", derivationState: "derived" },

  // Dòng họ nội (Cụ nội -> Ông nội)
  { id: "r-f-ong-noi", type: "bloodline_father", sourceId: "cu-noi-ong", targetId: "ong-noi", derivationState: "derived" },
  { id: "r-m-ong-noi", type: "bloodline_mother", sourceId: "cu-noi-ba", targetId: "ong-noi", derivationState: "derived" },

  // Con cái thế hệ 1 (từ Thiền + My)
  { id: "r-f-bac", type: "bloodline_father", sourceId: "ong-noi", targetId: "bac", derivationState: "derived" },
  { id: "r-m-bac", type: "bloodline_mother", sourceId: "ba-noi", targetId: "bac", derivationState: "derived" },
  { id: "r-f-ba", type: "bloodline_father", sourceId: "ong-noi", targetId: "ba", derivationState: "derived" },
  { id: "r-m-ba", type: "bloodline_mother", sourceId: "ba-noi", targetId: "ba", derivationState: "derived" },
  { id: "r-m-co", type: "bloodline_mother", sourceId: "ba-noi", targetId: "co", derivationState: "derived" },
  { id: "r-f-chu", type: "bloodline_father", sourceId: "ong-noi", targetId: "chu", derivationState: "derived" },
  { id: "r-m-chu", type: "bloodline_mother", sourceId: "ba-noi", targetId: "chu", derivationState: "derived" },

  // Con cái thế hệ 1 (từ Tăng)
  { id: "r-f-ma", type: "bloodline_father", sourceId: "ong-ngoai", targetId: "ma", derivationState: "derived" },
  { id: "r-f-di", type: "bloodline_father", sourceId: "ong-ngoai", targetId: "di", derivationState: "derived" },
  { id: "r-f-cau", type: "bloodline_father", sourceId: "ong-ngoai", targetId: "cau", derivationState: "derived" },

  // Con cái Cô Phượng + Dượng Hùng
  { id: "r-f-conco-tuan", type: "bloodline_father", sourceId: "duong", targetId: "con-co-tuan", derivationState: "derived" },
  { id: "r-m-conco-tuan", type: "bloodline_mother", sourceId: "co", targetId: "con-co-tuan", derivationState: "derived" },
  { id: "r-f-conco-lan", type: "bloodline_father", sourceId: "duong", targetId: "con-co-lan", derivationState: "derived" },
  { id: "r-m-conco-lan", type: "bloodline_mother", sourceId: "co", targetId: "con-co-lan", derivationState: "derived" },

  // Nhánh riêng của Dượng Hùng, được rút gọn khi góc nhìn vẫn thuộc dòng họ chính
  { id: "r-f-duong", type: "bloodline_father", sourceId: "duong-cha", targetId: "duong", derivationState: "derived" },
  { id: "r-m-duong", type: "bloodline_mother", sourceId: "duong-me", targetId: "duong", derivationState: "derived" },
  { id: "r-f-duong-em", type: "bloodline_father", sourceId: "duong-cha", targetId: "duong-em-gai", derivationState: "derived" },
  { id: "r-m-duong-em", type: "bloodline_mother", sourceId: "duong-me", targetId: "duong-em-gai", derivationState: "derived" },
  { id: "r-f-duong-chau", type: "bloodline_father", sourceId: "duong-em-re", targetId: "duong-chau", derivationState: "derived" },
  { id: "r-m-duong-chau", type: "bloodline_mother", sourceId: "duong-em-gai", targetId: "duong-chau", derivationState: "derived" },

  // Con cái thế hệ 2
  { id: "r-f-anh-ho", type: "bloodline_father", sourceId: "bac", targetId: "anh-ho", derivationState: "derived" },
  { id: "r-f-anh-ruot", type: "bloodline_father", sourceId: "ba", targetId: "anh-ruot", derivationState: "derived" },
  { id: "r-m-anh-ruot", type: "bloodline_mother", sourceId: "ma", targetId: "anh-ruot", derivationState: "derived" },
  { id: "r-f-ego", type: "bloodline_father", sourceId: "ba", targetId: "ego", derivationState: "derived" },
  { id: "r-m-ego", type: "bloodline_mother", sourceId: "ma", targetId: "ego", derivationState: "derived" },
  { id: "r-f-em", type: "bloodline_father", sourceId: "ba", targetId: "em", derivationState: "derived" },
  { id: "r-m-em", type: "bloodline_mother", sourceId: "ma", targetId: "em", derivationState: "derived" },
  { id: "r-f-em-ho-noi", type: "bloodline_father", sourceId: "chu", targetId: "em-ho-noi", derivationState: "derived" },
  { id: "r-f-em-ho-ngoai", type: "bloodline_father", sourceId: "cau", targetId: "em-ho-ngoai", derivationState: "derived" },

  // Con cái thế hệ 3
  { id: "r-f-con-trai", type: "bloodline_father", sourceId: "ego", targetId: "con-trai", derivationState: "derived" },
  { id: "r-m-con-trai", type: "bloodline_mother", sourceId: "vo", targetId: "con-trai", derivationState: "derived" },
  { id: "r-f-con-gai", type: "bloodline_father", sourceId: "ego", targetId: "con-gai", derivationState: "derived" },
  { id: "r-m-con-gai", type: "bloodline_mother", sourceId: "vo", targetId: "con-gai", derivationState: "derived" },
  { id: "r-f-chau-ho-nam", type: "bloodline_father", sourceId: "anh-ho", targetId: "chau-ho-nam", derivationState: "derived" },
  { id: "r-f-chau-ruot-khôi", type: "bloodline_father", sourceId: "anh-ruot", targetId: "chau-ruot-khôi", derivationState: "derived" },
  { id: "r-m-chau-ngoai-mai", type: "bloodline_mother", sourceId: "em", targetId: "chau-ngoai-mai", derivationState: "derived" },
  { id: "r-f-chau-ho-tien", type: "bloodline_father", sourceId: "em-ho-noi", targetId: "chau-ho-tien", derivationState: "derived" },
  { id: "r-f-chau-ho-dat", type: "bloodline_father", sourceId: "em-ho-noi", targetId: "chau-ho-dat", derivationState: "derived" },
  { id: "r-m-chau-ho-ngoai-an", type: "bloodline_mother", sourceId: "em-ho-ngoai", targetId: "chau-ho-ngoai-an", derivationState: "derived" }
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

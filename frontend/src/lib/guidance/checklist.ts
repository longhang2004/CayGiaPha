import type { GuidanceRole } from "@/content/help/helpTopics";

export type ChecklistItemId = "core-tree-open" | "core-first-person" | "core-first-primitive" | "core-inspect-address" | "core-viewpoint";
export interface GuidanceProductState { treeOpened: boolean; personCount: number; primitiveCount: number; addressInspected: boolean; viewpointChanged: boolean; }
export interface ChecklistItemDefinition { id: ChecklistItemId; title: string; topicId: string; roles: GuidanceRole[]; eligible: (state: GuidanceProductState) => boolean; complete: (state: GuidanceProductState) => boolean; }
const ALL: GuidanceRole[] = ["owner", "editor", "reader"];
export const CORE_CHECKLIST: ChecklistItemDefinition[] = [
  { id: "core-tree-open", title: "Tạo hoặc mở một cây", topicId: "tao-hoac-mo-cay", roles: ALL, eligible: () => true, complete: s => s.treeOpened },
  { id: "core-first-person", title: "Thêm người đầu tiên", topicId: "them-nguoi-dau-tien", roles: ["owner", "editor"], eligible: s => s.treeOpened && s.personCount === 0, complete: s => s.personCount > 0 },
  { id: "core-first-primitive", title: "Nối một quan hệ gần", topicId: "them-quan-he-ro-rang", roles: ["owner", "editor"], eligible: s => s.treeOpened && s.personCount > 0 && s.primitiveCount === 0, complete: s => s.primitiveCount > 0 },
  { id: "core-inspect-address", title: "Chọn một người để xem xưng hô", topicId: "xem-thong-tin-va-xung-ho", roles: ALL, eligible: s => s.treeOpened && s.personCount > 0, complete: s => s.addressInspected },
  { id: "core-viewpoint", title: "Thử đổi điểm nhìn", topicId: "doi-diem-nhin", roles: ALL, eligible: s => s.treeOpened && s.personCount >= 2, complete: s => s.viewpointChanged },
];
export function getEligibleChecklist(role: GuidanceRole, state: GuidanceProductState) { return CORE_CHECKLIST.filter(i => i.roles.includes(role) && (i.eligible(state) || i.complete(state))).slice(0, 5); }

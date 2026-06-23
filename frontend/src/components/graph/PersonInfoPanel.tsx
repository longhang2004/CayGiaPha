/**
 * Shows the selected person's info and the computed Form_Of_Address relative to
 * the current viewpoint (Requirement 8.1). When no defined term exists the
 * unresolved indicator is shown (8.7 / 10.3).
 */

import { addressLabel, isUnresolved, type Address, type Person } from "@/lib/graph";
import { Skeleton } from "@/components/ui/Skeleton";

export interface PersonInfoPanelProps {
  person: Person | null;
  ego: Person | null;
  address: Address | undefined;
  loading?: boolean;
}

const GENDER_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
};

export function PersonInfoPanel({ person, ego, address, loading }: PersonInfoPanelProps) {
  if (loading) {
    return (
      <aside className="person-info" aria-live="polite" aria-busy="true">
        <Skeleton variant="text" width="70%" height="1.5rem" />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="55%" />
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="rect" height="2.5rem" style={{ marginTop: "1rem" }} />
      </aside>
    );
  }

  if (!person) {
    return (
      <aside className="person-info" aria-live="polite">
        <p>Chọn một người để xem thông tin và cách xưng hô.</p>
      </aside>
    );
  }

  const isSelf = ego != null && ego.id === person.id;
  const unresolved = isUnresolved(address);

  return (
    <aside className="person-info" aria-live="polite" data-person-id={person.id}>
      <h2>{person.displayName}</h2>
      <dl>
        {person.gender ? (
          <div>
            <dt>Giới tính</dt>
            <dd>{GENDER_LABEL[person.gender] ?? person.gender}</dd>
          </div>
        ) : null}
        {person.birthYear != null ? (
          <div>
            <dt>Năm sinh</dt>
            <dd>{person.birthYear}</dd>
          </div>
        ) : null}
        {person.birthOrder != null ? (
          <div>
            <dt>Thứ tự trong gia đình</dt>
            <dd>Con thứ {person.birthOrder}</dd>
          </div>
        ) : null}
        {person.deceased != null ? (
          <div>
            <dt>Tình trạng</dt>
            <dd>{person.deceased ? "Đã mất" : "Còn sống"}</dd>
          </div>
        ) : null}
        <div>
          <dt>Cách xưng hô{ego ? ` (${ego.displayName} gọi)` : ""}</dt>
          <dd data-address data-unresolved={unresolved ? "true" : "false"}>
            {isSelf ? "Bản thân" : addressLabel(address)}
          </dd>
        </div>
      </dl>
    </aside>
  );
}

/**
 * Shows the selected person's info and the computed Form_Of_Address relative to
 * the current viewpoint (Requirement 8.1). When no defined term exists the
 * unresolved indicator is shown (8.7 / 10.3).
 */

import { addressLabel, isUnresolved, type Address, type Person } from "@/lib/graph";

export interface PersonInfoPanelProps {
  person: Person | null;
  ego: Person | null;
  address: Address | undefined;
}

const GENDER_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
};

export function PersonInfoPanel({ person, ego, address }: PersonInfoPanelProps) {
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
            <dt>Vai vế (thứ tự sinh)</dt>
            <dd>{person.birthOrder}</dd>
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

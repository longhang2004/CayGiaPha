import { addressLabel, capitalize, isUnresolved, type Address, type Person } from "@/lib/graph";
import { CGPTabs } from "@/components/cgp";

export interface PersonInfoPanelProps {
  person: Person | null;
  ego: Person | null;
  address: Address | undefined;
  loading?: boolean;
  hideHeading?: boolean;
}

const GENDER_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
};

export function PersonInfoPanel({ person, ego, address, loading, hideHeading = false }: PersonInfoPanelProps) {
  if (loading) {
    return (
      <aside className="person-info" aria-live="polite" aria-busy="true" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "180px", gap: "0.75rem" }}>
        <div className="center-state__spinner" style={{ width: "2rem", height: "2rem", borderWidth: "3px" }} />
        <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "0.875rem" }}>Đang tính toán cách xưng hô…</p>
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
  const initialLetter = person.displayName ? person.displayName.trim().charAt(0).toUpperCase() : "?";

  // Timeline events generation
  const timelineEvents = [];
  if (person.birthYear) {
    timelineEvents.push({
      year: person.birthYear,
      content: `Sinh năm ${person.birthYear}.`,
    });
  }
  if (person.deceased) {
    timelineEvents.push({
      year: "†",
      content: "Đã qua đời. Lễ cúng giỗ được tổ chức hàng năm để dòng họ tưởng nhớ.",
    });
  }

  const tabItems = [
    {
      id: "info",
      label: "Chi tiết",
      content: (
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
              <dd>{person.deceased ? "Đã qua đời" : "Còn sống"}</dd>
            </div>
          ) : null}
          <div>
            <dt>Cách xưng hô{ego ? ` (${ego.displayName} gọi)` : ""}</dt>
            <dd data-address data-unresolved={unresolved ? "true" : "false"}>
              {isSelf ? "Bản thân" : capitalize(addressLabel(address))}
            </dd>
          </div>
        </dl>
      ),
    },
    {
      id: "bio",
      label: "Tiểu sử & Sự kiện",
      content: (
        <div className="person-info__bio-panel">
          {timelineEvents.length > 0 ? (
            <div className="person-info__timeline" aria-label="Dòng thời gian sự kiện">
              {timelineEvents.map((event, idx) => (
                <div key={idx} className="person-info__timeline-item">
                  <div className="person-info__timeline-dot" />
                  <div className="person-info__timeline-year">{event.year}</div>
                  <div className="person-info__timeline-content">{event.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontStyle: "italic", fontSize: "0.875rem", margin: 0, padding: "0.5rem 0", color: "var(--color-muted)" }}>
              Chưa có sự kiện nào. Thêm năm sinh hoặc thông tin qua đời để xem tiểu sử.
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <aside className="person-info" aria-live="polite" data-person-id={person.id}>
      {/* Hidden/accessible heading to keep tests and screen-readers happy */}
      <h2 className={hideHeading ? "sr-only" : ""}>{person.displayName}</h2>

      {/* Visual Header Card */}
      <div className="person-info__avatar-container">
        <div className={`person-info__avatar person-info__avatar--${person.gender ?? "unknown"}`}>
          {initialLetter}
        </div>
        <div className="person-info__header-text">
          <span className="person-info__header-name">{person.displayName}</span>
          <span className="person-info__header-subtitle">
            {person.deceased ? "Thành viên (đã qua đời)" : "Thành viên (Còn sống)"}
          </span>
        </div>
      </div>

      <CGPTabs
        ariaLabel="Thông tin chi tiết"
        className="person-info__tabs"
        defaultSelectedKey="info"
        items={tabItems}
      />
    </aside>
  );
}

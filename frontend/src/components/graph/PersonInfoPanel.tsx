import { addressLabel, capitalize, isUnresolved, type Address, type Person } from "@/lib/graph";
import { CGPTabs } from "@/components/cgp";

export interface PersonInfoPanelProps {
  person: Person | null;
  ego: Person | null;
  address: Address | undefined;
  loading?: boolean;
  hideHeading?: boolean;
  addressGuidanceAnchor?: string;
}

const GENDER_LABEL: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
};

export function PersonInfoPanel({
  person,
  ego,
  address,
  loading,
  hideHeading = false,
  addressGuidanceAnchor,
}: PersonInfoPanelProps) {
  if (loading) {
    return (
      <aside className="person-info person-info--loading" aria-live="polite" aria-busy="true">
        <div className="center-state__spinner person-info__spinner" />
        <p>Đang tính toán cách xưng hô…</p>
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
        <dl className="person-info__facts">
          {person.gender ? (
            <div className="person-info__fact">
              <dt>Giới tính</dt>
              <dd>{GENDER_LABEL[person.gender] ?? person.gender}</dd>
            </div>
          ) : null}
          {person.birthYear != null ? (
            <div className="person-info__fact">
              <dt>Năm sinh</dt>
              <dd>{person.birthYear}</dd>
            </div>
          ) : null}
          {person.birthOrder != null ? (
            <div className="person-info__fact">
              <dt>Thứ tự trong gia đình</dt>
              <dd>Con thứ {person.birthOrder}</dd>
            </div>
          ) : null}
          {person.deceased != null ? (
            <div className="person-info__fact">
              <dt>Tình trạng</dt>
              <dd>{person.deceased ? "Đã qua đời" : "Còn sống"}</dd>
            </div>
          ) : null}
          <div
            className="person-info__address-callout"
            data-guidance-anchor={addressGuidanceAnchor}
          >
            <dt>Cách xưng hô</dt>
            <dd data-address data-unresolved={unresolved ? "true" : "false"}>
              {isSelf ? "Bản thân" : capitalize(addressLabel(address))}
            </dd>
            {ego ? <span>{ego.displayName} gọi</span> : null}
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
            <p className="person-info__empty-bio">
              Chưa có sự kiện nào. Thêm năm sinh hoặc thông tin qua đời để xem tiểu sử.
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <aside className="person-info" aria-live="polite" data-person-id={person.id}>
      {hideHeading ? null : <h2>{person.displayName}</h2>}

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

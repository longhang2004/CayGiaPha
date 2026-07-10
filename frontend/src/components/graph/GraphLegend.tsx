import { useState } from "react";
import { InfoIcon, CloseIcon } from "@/components/ui/Icons";

export function GraphLegend() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        className="graph-legend-toggle"
        onClick={() => setIsOpen(true)}
        aria-label="Hiện chú giải sơ đồ"
      >
        <InfoIcon size={20} />
        <span className="graph-legend-toggle__text hide-on-mobile">Chú giải</span>
      </button>
    );
  }

  return (
    <div className="graph-legend surface-card">
      <div className="graph-legend__header">
        <h3 className="graph-legend__title">Chú giải sơ đồ</h3>
        <button
          type="button"
          className="graph-legend__close"
          onClick={() => setIsOpen(false)}
          aria-label="Đóng chú giải"
        >
          <CloseIcon size={16} />
        </button>
      </div>
      <div className="graph-legend__body">
        <div className="graph-legend__item">
          <div className="graph-legend__line graph-legend__line--solid"></div>
          <span>Quan hệ huyết thống hoặc hôn nhân</span>
        </div>
        <div className="graph-legend__item">
          <div className="graph-legend__line graph-legend__line--dashed"></div>
          <span>Quan hệ khai báo hoặc đang xung đột</span>
        </div>
        <div className="graph-legend__item">
          <div className="graph-legend__line graph-legend__line--non-bloodline"></div>
          <span>Quan hệ xã hội, ngoài huyết thống</span>
        </div>
        <div className="graph-legend__item">
          <div className="graph-legend__node graph-legend__node--deceased">Aa</div>
          <span>Đã mất (mờ, gạch ngang)</span>
        </div>
        <div className="graph-legend__item">
          <div className="graph-legend__node graph-legend__node--ego">Aa</div>
          <span>Góc nhìn hiện tại</span>
        </div>
      </div>
    </div>
  );
}

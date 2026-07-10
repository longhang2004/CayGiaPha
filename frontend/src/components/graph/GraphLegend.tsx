import { useState, useRef, useEffect } from "react";
import { InfoIcon, CloseIcon } from "@/components/ui/Icons";

export function GraphLegend() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="graph-legend-wrapper" ref={wrapperRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className={`btn btn-secondary ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Chú giải sơ đồ"
        aria-label="Hiện chú giải sơ đồ"
      >
        <InfoIcon size={18} />
        <span className="hide-on-tablet hide-on-mobile">Chú giải</span>
      </button>

      {isOpen && (
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
      )}
    </div>
  );
}

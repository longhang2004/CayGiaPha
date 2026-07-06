"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CloseIcon, LightbulbIcon } from "@/components/ui/Icons";

type Placement = "top" | "bottom" | "center";

interface TourStep {
  title: string;
  body: string;
  selectors: string[];
  placement?: Placement;
  spotlight?: boolean;
}

interface TourGeometry {
  tooltip: {
    left: number;
    top: number;
    width: number;
  };
  spotlight?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

interface TreeWorkspaceTourProps {
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = "tree_workspace_tour_seen_v1";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

function findVisibleTarget(selectors: string[]) {
  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const target = elements.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    });

    if (target) return target;
  }

  return null;
}

export function TreeWorkspaceTour({ storageKey = DEFAULT_STORAGE_KEY }: TreeWorkspaceTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [geometry, setGeometry] = useState<TourGeometry | null>(null);

  const steps = useMemo<TourStep[]>(
    () => [
      {
        title: "Di chuyển trên sơ đồ",
        body: "Kéo nền để xem các nhánh xa hơn. Dùng cuộn chuột hoặc hai ngón tay để phóng to, thu nhỏ.",
        selectors: [".tree-workspace__graph"],
        placement: "center",
        spotlight: false,
      },
      {
        title: "Tìm nhanh người thân",
        body: "Gõ tên hoặc cách xưng hô như ba, cô, cháu để nhảy nhanh tới đúng người trong cây.",
        selectors: [".tree-page-header__search-container input", ".tree-page-header__search-container"],
        placement: "top",
      },
      {
        title: "Đổi góc nhìn xưng hô",
        body: "Chọn một người làm góc nhìn để toàn bộ cách xưng hô trên sơ đồ được tính lại theo người đó.",
        selectors: [
          ".tree-page-header__viewpoint-inline select",
          ".tree-page-header__row-two select",
          ".tree-page-header__viewpoint-inline",
          ".tree-page-header__row-two",
        ],
        placement: "top",
      },
      {
        title: "Thêm và cộng tác",
        body: "Dùng nút cộng để thêm thành viên. Nút cộng tác dùng để mời người thân cùng cập nhật cây.",
        selectors: [".tree-page-header__actions"],
        placement: "top",
      },
      {
        title: "Điều hướng bản đồ",
        body: "Cụm nút cạnh sơ đồ giúp zoom, tìm lại vùng đang xem, tải ảnh hoặc mở toàn màn hình.",
        selectors: [".tree-graph__nav-controls"],
        placement: "bottom",
      },
    ],
    [],
  );

  const closeTour = useCallback(() => {
    setIsOpen(false);
    try {
      window.localStorage.setItem(storageKey, "true");
    } catch {
      // Ignore storage errors; the tour can safely reappear next visit.
    }
  }, [storageKey]);

  const updateGeometry = useCallback(() => {
    if (!isOpen) return;

    const step = steps[stepIndex];
    const target = findVisibleTarget(step.selectors);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const width = Math.min(340, viewportWidth - margin * 2);

    if (!target || step.placement === "center") {
      setGeometry({
        tooltip: {
          width,
          left: (viewportWidth - width) / 2,
          top: clamp(viewportHeight * 0.42, margin, viewportHeight - 240),
        },
      });
      return;
    }

    const rect = target.getBoundingClientRect();
    const tooltipHeight = 190;
    const preferredTop =
      step.placement === "bottom"
        ? rect.bottom + margin
        : rect.top - tooltipHeight - margin;
    const fallbackTop =
      step.placement === "bottom"
        ? rect.top - tooltipHeight - margin
        : rect.bottom + margin;
    const top = clamp(
      preferredTop >= margin && preferredTop + tooltipHeight <= viewportHeight - margin
        ? preferredTop
        : fallbackTop,
      margin,
      viewportHeight - tooltipHeight - margin,
    );

    setGeometry({
      tooltip: {
        width,
        left: clamp(rect.left + rect.width / 2 - width / 2, margin, viewportWidth - width - margin),
        top,
      },
      spotlight: step.spotlight === false ? undefined : {
        left: clamp(rect.left - 8, margin, viewportWidth - margin),
        top: clamp(rect.top - 8, margin, viewportHeight - margin),
        width: Math.min(rect.width + 16, viewportWidth - margin * 2),
        height: Math.min(rect.height + 16, viewportHeight - margin * 2),
      },
    });
  }, [isOpen, stepIndex, steps]);

  useEffect(() => {
    try {
      setIsOpen(window.localStorage.getItem(storageKey) !== "true");
    } catch {
      setIsOpen(true);
    }
  }, [storageKey]);

  useEffect(() => {
    updateGeometry();
    if (!isOpen) return;

    const raf = window.requestAnimationFrame(updateGeometry);
    window.addEventListener("resize", updateGeometry);
    window.addEventListener("scroll", updateGeometry, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateGeometry);
      window.removeEventListener("scroll", updateGeometry, true);
    };
  }, [isOpen, stepIndex, updateGeometry]);

  if (!isOpen || !geometry) return null;

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  return (
    <div className="tree-tour" aria-live="polite">
      <div className="tree-tour__scrim" aria-hidden="true" />
      {geometry.spotlight ? (
        <div
          className="tree-tour__spotlight"
          style={{
            left: geometry.spotlight.left,
            top: geometry.spotlight.top,
            width: geometry.spotlight.width,
            height: geometry.spotlight.height,
          }}
          aria-hidden="true"
        />
      ) : null}
      <section
        className="tree-tour__card"
        role="dialog"
        aria-modal="false"
        aria-labelledby="tree-tour-title"
        style={{
          left: geometry.tooltip.left,
          top: geometry.tooltip.top,
          width: geometry.tooltip.width,
        }}
      >
        <button
          type="button"
          className="tree-tour__close"
          onClick={closeTour}
          aria-label="Bỏ qua hướng dẫn trong cây"
        >
          <CloseIcon size={18} />
        </button>
        <div className="tree-tour__eyebrow">
          <LightbulbIcon size={16} />
          <span>Bước {stepIndex + 1}/{steps.length}</span>
        </div>
        <h2 id="tree-tour-title" className="tree-tour__title">{step.title}</h2>
        <p className="tree-tour__body">{step.body}</p>
        <div className="tree-tour__footer">
          <button type="button" className="btn btn-secondary tree-tour__button" onClick={closeTour}>
            Bỏ qua
          </button>
          <button
            type="button"
            className="btn btn-primary btn-terracotta tree-tour__button"
            onClick={() => {
              if (isLastStep) {
                closeTour();
              } else {
                setStepIndex((current) => current + 1);
              }
            }}
          >
            {isLastStep ? "Đã hiểu" : "Tiếp theo"}
          </button>
        </div>
      </section>
    </div>
  );
}

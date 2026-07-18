"use client";

import { useMemo } from "react";
import { photoUrl, type Photo } from "@/lib/photos";

interface PhotoTimelineProps {
  treeId: string;
  personId: string;
  photos: Photo[];
  canEdit: boolean;
  busy: boolean;
  onSetPrimary: (photoId: string) => void;
  onDelete: (photoId: string) => void;
}

export function PhotoTimeline({
  treeId,
  personId,
  photos,
  canEdit,
  busy,
  onSetPrimary,
  onDelete,
}: PhotoTimelineProps) {
  const { groups, sortedYears } = useMemo(() => {
    const grouped: Record<string, Photo[]> = {};
    for (const photo of photos) {
      const year = photo.photoYear ? photo.photoYear.toString() : "Chưa rõ năm";
      grouped[year] ??= [];
      grouped[year].push(photo);
    }
    const years = Object.keys(grouped).sort((a, b) => {
      if (a === "Chưa rõ năm") return 1;
      if (b === "Chưa rõ năm") return -1;
      return Number(b) - Number(a);
    });
    return { groups: grouped, sortedYears: years };
  }, [photos]);

  return (
    <div className="photo-timeline">
      {sortedYears.map((year) => (
        <div key={year} className="photo-timeline-group">
          <h3 className="photo-timeline-year-heading">
            {year === "Chưa rõ năm" ? "Chưa rõ năm chụp" : `Năm ${year}`}
          </h3>
          <ul className="photo-grid">
            {groups[year].map((photo) => (
              <li key={photo.id} data-testid="photo-item">
                <img
                  src={photoUrl(treeId, personId, photo.id)}
                  alt={photo.primary ? "Ảnh đại diện" : "Ảnh"}
                  width={photo.width ?? undefined}
                  height={photo.height ?? undefined}
                />
                {photo.primary ? (
                  <span data-testid="primary-badge">Ảnh đại diện</span>
                ) : null}
                {photo.description ? (
                  <p className="photo-item__description" title={photo.description}>
                    {photo.description}
                  </p>
                ) : null}
                {canEdit ? (
                  <div className="photo-item__actions">
                    {!photo.primary ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onSetPrimary(photo.id)}
                      >
                        Đặt làm ảnh đại diện
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDelete(photo.id)}
                      aria-label="Xóa ảnh này"
                    >
                      Xóa
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

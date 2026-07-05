"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  deletePhoto,
  listPhotos,
  photoUrl,
  setPrimaryPhoto,
  uploadPhoto,
  type Photo,
} from "@/lib/photos";

/**
 * Person photo gallery and management (Requirement 24).
 *
 * Lists a person's photos, lets an authorized editor upload a JPEG/PNG, mark one as the primary,
 * and delete photos. Image bytes load from the gated serving endpoint via {@link photoUrl}. Errors
 * from the backend envelope (e.g. unsupported type, too large) are surfaced inline.
 *
 * When {@code canEdit} is false the gallery is read-only (no upload/primary/delete controls).
 */
interface PersonPhotosProps {
  treeId: string;
  personId: string;
  /** Whether the viewer may modify photos (owner or the node's linked user). */
  canEdit?: boolean;
}

const MAX_PHOTOS_PER_PERSON = 5;

export function PersonPhotos({ treeId, personId, canEdit = false }: PersonPhotosProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Upload metadata form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [yearInput, setYearInput] = useState<string>("");
  const [descriptionInput, setDescriptionInput] = useState<string>("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    listPhotos(treeId, personId)
      .then((result) => {
        if (active) {
          setPhotos(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(messageOf(err));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [treeId, personId]);

  async function refresh() {
    setPhotos(await listPhotos(treeId, personId));
  }

  async function handleConfirmUpload() {
    if (!selectedFile) return;
    setError(null);
    setBusy(true);
    try {
      const yearVal = yearInput ? parseInt(yearInput, 10) : undefined;
      await uploadPhoto(treeId, personId, selectedFile, yearVal, descriptionInput || undefined);
      await refresh();
      setSelectedFile(null);
      setYearInput("");
      setDescriptionInput("");
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  }

  async function handleSetPrimary(photoId: string) {
    setError(null);
    setBusy(true);
    try {
      await setPrimaryPhoto(treeId, personId, photoId);
      await refresh();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(photoId: string) {
    setError(null);
    setBusy(true);
    try {
      await deletePhoto(treeId, personId, photoId);
      await refresh();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  // Group photos by year for timeline display
  const { groups, sortedYears } = useMemo(() => {
    const groups: { [key: string]: Photo[] } = {};
    photos.forEach((photo) => {
      const year = photo.photoYear ? photo.photoYear.toString() : "Chưa rõ năm";
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(photo);
    });

    const sortedYears = Object.keys(groups).sort((a, b) => {
      if (a === "Chưa rõ năm") return 1;
      if (b === "Chưa rõ năm") return -1;
      return parseInt(b, 10) - parseInt(a, 10);
    });

    return { groups, sortedYears };
  }, [photos]);

  const hasReachedPhotoLimit = photos.length >= MAX_PHOTOS_PER_PERSON;

  return (
    <section aria-label="Thư viện ảnh">
      <h2>Thư viện ảnh</h2>

      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}

      {canEdit ? (
        hasReachedPhotoLimit ? (
          <p className="field-hint" role="status">
            Mỗi thành viên chỉ được tải tối đa {MAX_PHOTOS_PER_PERSON} ảnh.
          </p>
        ) : selectedFile ? (
          <div
            className="surface-card photo-upload-metadata-form"
            style={{
              padding: "1rem",
              border: "1px solid var(--color-hairline)",
              borderRadius: "8px",
              marginBottom: "1rem"
            }}
          >
            <h4 style={{ margin: "0 0 1rem 0" }}>Thêm thông tin cho ảnh: {selectedFile.name}</h4>

            <div className="field" style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="photo-year-input"
                className="label"
                style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem" }}
              >
                Năm chụp (tùy chọn)
              </label>
              <input
                id="photo-year-input"
                type="number"
                className="input"
                placeholder="Ví dụ: 1995"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div className="field" style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="photo-description-input"
                className="label"
                style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem" }}
              >
                Mô tả ảnh (tùy chọn)
              </label>
              <textarea
                id="photo-description-input"
                className="input"
                placeholder="Ví dụ: Họp mặt gia đình, ông bà nội..."
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                style={{ width: "100%", minHeight: "60px", padding: "0.5rem", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                disabled={busy}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void handleConfirmUpload()}
                disabled={busy}
              >
                {busy ? "Đang tải lên…" : "Lưu ảnh"}
              </button>
            </div>
          </div>
        ) : (
          <div className="field photo-upload-container">
            <input
              id="photo-upload"
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png"
              disabled={busy || hasReachedPhotoLimit}
              className="photo-upload-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  const suggestedYear = new Date(file.lastModified).getFullYear();
                  setYearInput(suggestedYear.toString());
                  setDescriptionInput("");
                }
              }}
            />
            <label htmlFor="photo-upload" className={`photo-upload-zone ${(busy || hasReachedPhotoLimit) ? "photo-upload-zone--disabled" : ""}`}>
              <span className="photo-upload-zone__icon">📤</span>
              <span className="photo-upload-zone__title">Tải ảnh lên</span>
              <span className="photo-upload-zone__subtitle">Kéo thả hoặc click để chọn ảnh (JPEG, PNG). Tối đa {MAX_PHOTOS_PER_PERSON} ảnh/người.</span>
            </label>
          </div>
        )
      ) : null}

      {loading ? (
        <p role="status">Đang tải ảnh…</p>
      ) : photos.length === 0 ? (
        <p>Chưa có ảnh nào.</p>
      ) : (
        <div className="photo-timeline">
          {sortedYears.map((year) => (
            <div key={year} className="photo-timeline-group" style={{ marginBottom: "1.5rem" }}>
              <h3
                className="photo-timeline-year-heading"
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "var(--color-brand)",
                  borderBottom: "1px solid var(--color-hairline)",
                  paddingBottom: "0.25rem",
                  margin: "1rem 0 0.5rem 0"
                }}
              >
                {year === "Chưa rõ năm" ? "Chưa rõ năm chụp" : `Năm ${year}`}
              </h3>
              <ul className="photo-grid" style={{ margin: "0" }}>
                {groups[year].map((photo) => (
                  <li key={photo.id} data-testid="photo-item">
                    <img
                      src={photoUrl(treeId, personId, photo.id)}
                      alt={photo.primary ? "Ảnh đại diện" : "Ảnh"}
                      width={photo.width ?? undefined}
                      height={photo.height ?? undefined}
                    />
                    {photo.primary ? <span data-testid="primary-badge">Ảnh đại diện</span> : null}
                    
                    {photo.description && (
                      <p
                        className="photo-item__description"
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-fg-muted)",
                          margin: "4px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          padding: "0 4px"
                        }}
                        title={photo.description}
                      >
                        {photo.description}
                      </p>
                    )}

                    {canEdit ? (
                      <div>
                        {!photo.primary ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSetPrimary(photo.id)}
                          >
                            Đặt làm ảnh đại diện
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDelete(photo.id)}
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
      )}
    </section>
  );
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  return "Không thể tải ảnh. Vui lòng thử lại.";
}

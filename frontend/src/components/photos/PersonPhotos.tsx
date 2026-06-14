"use client";

import { useEffect, useRef, useState } from "react";
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

export function PersonPhotos({ treeId, personId, canEdit = false }: PersonPhotosProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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

  async function handleUpload(file: File) {
    setError(null);
    setBusy(true);
    try {
      await uploadPhoto(treeId, personId, file);
      await refresh();
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

  return (
    <section aria-label="Ảnh">
      <h2>Ảnh</h2>

      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}

      {canEdit ? (
        <div className="field">
          <label htmlFor="photo-upload">Tải ảnh lên (JPEG hoặc PNG)</label>
          <input
            id="photo-upload"
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleUpload(file);
              }
            }}
          />
        </div>
      ) : null}

      {loading ? (
        <p role="status">Đang tải ảnh…</p>
      ) : photos.length === 0 ? (
        <p>Chưa có ảnh nào.</p>
      ) : (
        <ul className="photo-grid">
          {photos.map((photo) => (
            <li key={photo.id} data-testid="photo-item">
              <img
                src={photoUrl(treeId, personId, photo.id)}
                alt={photo.primary ? "Ảnh đại diện" : "Ảnh"}
                width={photo.width ?? undefined}
                height={photo.height ?? undefined}
              />
              {photo.primary ? <span data-testid="primary-badge">Ảnh đại diện</span> : null}
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
                  >
                    Xóa
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
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

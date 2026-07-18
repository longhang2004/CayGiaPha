"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import {
  deletePhoto,
  listPhotos,
  setPrimaryPhoto,
  uploadPhoto,
  type Photo,
} from "@/lib/photos";
import { PhotoFilePicker } from "./PhotoFilePicker";
import { PhotoMetadataForm } from "./PhotoMetadataForm";
import { PhotoTimeline } from "./PhotoTimeline";

interface PersonPhotosProps {
  treeId: string;
  personId: string;
  canEdit?: boolean;
}

const MAX_PHOTOS_PER_PERSON = 5;

export function PersonPhotos({ treeId, personId, canEdit = false }: PersonPhotosProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [yearInput, setYearInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");

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
        if (active) setError(messageOf(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [treeId, personId]);

  async function refresh() {
    setPhotos(await listPhotos(treeId, personId));
  }

  function handleFileChange(file: File | null) {
    setSelectedFile(file);
    setYearInput(file ? new Date(file.lastModified).getFullYear().toString() : "");
    setDescriptionInput("");
  }

  async function handleConfirmUpload() {
    if (!selectedFile) return;
    setError(null);
    setBusy(true);
    try {
      const year = yearInput ? parseInt(yearInput, 10) : undefined;
      const uploadedPhoto = await uploadPhoto(
        treeId,
        personId,
        selectedFile,
        year,
        descriptionInput || undefined,
      );
      handleFileChange(null);
      setPhotos((current) => [
        uploadedPhoto,
        ...current.filter((photo) => photo.id !== uploadedPhoto.id),
      ]);
      try {
        await refresh();
      } catch {
        setError("Ảnh đã tải lên. Danh sách ảnh chưa cập nhật được.");
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
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

  const hasReachedPhotoLimit = photos.length >= MAX_PHOTOS_PER_PERSON;

  return (
    <section aria-label="Thư viện ảnh" className="person-photos">
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
        ) : (
          <>
            <PhotoFilePicker
              id="photo-upload"
              value={selectedFile}
              onChange={handleFileChange}
              label="Tải ảnh lên"
              hint={`JPEG hoặc PNG. Tối đa ${MAX_PHOTOS_PER_PERSON} ảnh mỗi người.`}
              disabled={busy}
            />
            {selectedFile ? (
              <PhotoMetadataForm
                filename={selectedFile.name}
                year={yearInput}
                description={descriptionInput}
                busy={busy}
                onYearChange={setYearInput}
                onDescriptionChange={setDescriptionInput}
                onCancel={() => handleFileChange(null)}
                onSubmit={() => void handleConfirmUpload()}
              />
            ) : null}
          </>
        )
      ) : null}

      {loading ? (
        <p role="status">Đang tải ảnh…</p>
      ) : photos.length === 0 ? (
        <p>Chưa có ảnh nào.</p>
      ) : (
        <PhotoTimeline
          treeId={treeId}
          personId={personId}
          photos={photos}
          canEdit={canEdit}
          busy={busy}
          onSetPrimary={(photoId) => void handleSetPrimary(photoId)}
          onDelete={(photoId) => void handleDelete(photoId)}
        />
      )}
    </section>
  );
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Không thể tải ảnh. Vui lòng thử lại.";
}

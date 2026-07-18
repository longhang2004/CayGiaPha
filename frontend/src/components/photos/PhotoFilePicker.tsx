"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

export const PHOTO_FILE_ACCEPT = "image/jpeg,image/png";
export const MAX_PHOTO_FILE_BYTES = 5 * 1024 * 1024;

const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png"]);

export function validatePhotoFile(file: File): string | null {
  if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
    return "Chỉ nhận ảnh JPEG hoặc PNG.";
  }
  if (file.size > MAX_PHOTO_FILE_BYTES) {
    return "Ảnh không được lớn hơn 5 MiB.";
  }
  return null;
}

export interface PhotoFilePickerProps {
  id: string;
  value: File | null;
  onChange: (file: File | null) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export function PhotoFilePicker({
  id,
  value,
  onChange,
  label,
  hint,
  disabled = false,
}: PhotoFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  useEffect(() => {
    if (
      !value ||
      typeof URL.createObjectURL !== "function" ||
      typeof URL.revokeObjectURL !== "function"
    ) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(value);
    const revokeObjectUrl = URL.revokeObjectURL.bind(URL);
    setPreviewUrl(objectUrl);
    return () => revokeObjectUrl(objectUrl);
  }, [value]);

  function acceptFile(file: File | undefined) {
    if (!file || disabled) return;
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onChange(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="photo-file-picker" data-disabled={disabled || undefined}>
      <label className="photo-file-picker__label" htmlFor={id}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        className="photo-file-picker__input"
        type="file"
        accept={PHOTO_FILE_ACCEPT}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={handleInputChange}
      />

      <div
        className="photo-file-picker__dropzone"
        data-active={dragActive || undefined}
        data-selected={value ? true : undefined}
        data-testid="photo-file-dropzone"
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        {value ? (
          <div className="photo-file-picker__selection">
            {previewUrl ? (
              <img
                className="photo-file-picker__preview"
                src={previewUrl}
                alt={`Xem trước ${value.name}`}
              />
            ) : null}
            <span className="photo-file-picker__filename" title={value.name}>
              {value.name}
            </span>
            <div className="photo-file-picker__actions">
              <label className="photo-file-picker__action" htmlFor={id}>
                Đổi ảnh
              </label>
              <button
                type="button"
                className="photo-file-picker__action"
                disabled={disabled}
                onClick={() => {
                  setError(null);
                  onChange(null);
                }}
              >
                Bỏ ảnh
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="photo-file-picker__choose"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <span aria-hidden="true" className="photo-file-picker__choose-icon">
              +
            </span>
            <span>
              <strong>Chọn ảnh</strong>
              <small>hoặc thả ảnh vào đây</small>
            </span>
          </button>
        )}
      </div>

      {hint ? (
        <p id={hintId} className="photo-file-picker__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="photo-file-picker__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { CGPButton } from "@/components/cgp";

interface PhotoMetadataFormProps {
  filename: string;
  year: string;
  description: string;
  busy: boolean;
  onYearChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function PhotoMetadataForm({
  filename,
  year,
  description,
  busy,
  onYearChange,
  onDescriptionChange,
  onCancel,
  onSubmit,
}: PhotoMetadataFormProps) {
  return (
    <div className="surface-card photo-upload-metadata-form">
      <h4>Thêm thông tin cho ảnh: {filename}</h4>

      <div className="field photo-upload-metadata-form__field">
        <label htmlFor="photo-year-input" className="label">
          Năm chụp (tùy chọn)
        </label>
        <input
          id="photo-year-input"
          type="number"
          className="input"
          placeholder="Ví dụ: 1995"
          value={year}
          disabled={busy}
          onChange={(event) => onYearChange(event.target.value)}
        />
      </div>

      <div className="field photo-upload-metadata-form__field">
        <label htmlFor="photo-description-input" className="label">
          Mô tả ảnh (tùy chọn)
        </label>
        <textarea
          id="photo-description-input"
          className="input photo-upload-metadata-form__description"
          placeholder="Ví dụ: Họp mặt gia đình, ông bà nội..."
          value={description}
          disabled={busy}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
      </div>

      <div className="photo-upload-metadata-form__actions">
        <CGPButton
          type="button"
          variant="secondary"
          className="btn-secondary"
          onPress={onCancel}
          isDisabled={busy}
        >
          Hủy
        </CGPButton>
        <CGPButton
          type="button"
          onPress={onSubmit}
          loading={busy}
          loadingLabel="Đang tải lên…"
        >
          Lưu ảnh
        </CGPButton>
      </div>
    </div>
  );
}

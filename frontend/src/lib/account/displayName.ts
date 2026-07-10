import { ApiException } from "@/lib/services/errors";

const CONTROL_CHARACTER_PATTERN = /\p{Cc}/u;

export function normalizeAndValidateDisplayName(raw: unknown): string {
  if (typeof raw !== "string") {
    throw ApiException.validation("displayName", "Vui lòng nhập tên hiển thị.");
  }
  if (CONTROL_CHARACTER_PATTERN.test(raw)) {
    throw ApiException.validation(
      "displayName",
      "Tên hiển thị không được chứa ký tự điều khiển.",
    );
  }

  const normalized = raw.trim().replace(/\s+/gu, " ");
  const length = Array.from(normalized).length;
  if (length < 1 || length > 100) {
    throw ApiException.validation(
      "displayName",
      "Tên hiển thị phải có từ 1 đến 100 ký tự.",
    );
  }
  return normalized;
}

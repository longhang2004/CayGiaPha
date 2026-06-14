import { API_BASE_PATH } from "./apiClient";

/**
 * Mirror of the internal relative-path URL building used by the API client,
 * exposed for property testing. Always roots a relative path under the
 * `/api/v1` prefix with exactly one separating slash.
 */
export function buildApiUrlForTest(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_PATH}${normalized}`;
}

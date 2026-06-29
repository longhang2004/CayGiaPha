/**
 * Person photo API helpers (Requirement 24).
 *
 * Photos are managed under `/persons/{personId}/photos` with the owning `treeId` as a query param,
 * mirroring the other person endpoints. Upload uses `multipart/form-data` (so it bypasses the JSON
 * {@link api} client and posts a `FormData` directly), while listing, setting the primary photo, and
 * deleting are ordinary JSON calls. Image bytes are served from a gated endpoint; {@link photoUrl}
 * builds that same-origin URL for use as an `<img>` source (the session cookie is sent automatically).
 */

import { API_BASE_PATH, ApiError, type ApiErrorBody, api } from "./apiClient";

export interface Photo {
  id: string;
  personId: string;
  contentType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  primary: boolean;
  photoYear?: number | null;
  description?: string | null;
}

function photosPath(treeId: string, personId: string): string {
  return `/persons/${encodeURIComponent(personId)}/photos?treeId=${encodeURIComponent(treeId)}`;
}

/** List a person's photos (metadata), newest first. */
export function listPhotos(treeId: string, personId: string): Promise<Photo[]> {
  return api.get<Photo[]>(photosPath(treeId, personId));
}

/** Set a photo as the person's primary. */
export function setPrimaryPhoto(
  treeId: string,
  personId: string,
  photoId: string,
): Promise<Photo> {
  return api.patch<Photo>(
    `/persons/${encodeURIComponent(personId)}/photos/${encodeURIComponent(photoId)}/primary` +
      `?treeId=${encodeURIComponent(treeId)}`,
  );
}

/** Delete a photo. */
export function deletePhoto(
  treeId: string,
  personId: string,
  photoId: string,
): Promise<void> {
  return api.del<void>(
    `/persons/${encodeURIComponent(personId)}/photos/${encodeURIComponent(photoId)}` +
      `?treeId=${encodeURIComponent(treeId)}`,
  );
}

/** Same-origin URL for a photo's bytes, suitable as an `<img>` src (cookie sent automatically). */
export function photoUrl(treeId: string, personId: string, photoId: string): string {
  return (
    `${API_BASE_PATH}/persons/${encodeURIComponent(personId)}/photos/${encodeURIComponent(photoId)}` +
    `?treeId=${encodeURIComponent(treeId)}`
  );
}

/**
 * Upload an image for a person (JPEG/PNG). Posts multipart form data; on failure throws the typed
 * {@link ApiError} parsed from the backend error envelope, so callers can show field-level messages.
 */
export async function uploadPhoto(
  treeId: string,
  personId: string,
  file: File,
  photoYear?: number,
  description?: string,
): Promise<Photo> {
  const form = new FormData();
  form.append("file", file);

  let url =
    `${API_BASE_PATH}/persons/${encodeURIComponent(personId)}/photos` +
    `?treeId=${encodeURIComponent(treeId)}`;
  if (photoYear !== undefined && photoYear !== null) {
    url += `&photoYear=${encodeURIComponent(photoYear)}`;
  }
  if (description !== undefined && description !== null) {
    url += `&description=${encodeURIComponent(description)}`;
  }
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
    body: form,
  });

  const text = await response.text();
  const payload = text ? safeParse(text) : undefined;
  if (!response.ok) {
    const envelope =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error: Partial<ApiErrorBody> }).error
        : undefined;
    throw new ApiError(response.status, envelope);
  }
  return payload as Photo;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

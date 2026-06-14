/**
 * API client layer for the Vietnamese Family Tree frontend.
 *
 * All requests target the same-origin `/api/v1` prefix (the Next.js dev server
 * proxies `/api/*` to the Spring Boot backend — see next.config.mjs). Because
 * the backend session is carried in an HttpOnly / Secure / SameSite cookie, the
 * browser attaches it automatically; we only have to opt in with
 * `credentials: "include"`. The cookie is never read or written from JS.
 *
 * Errors from the backend use the envelope `{ error: { code, field?, message } }`
 * (see design "Error Handling"). This client surfaces that envelope as a typed
 * `ApiError` so UI code can show field-level messages.
 */

export const API_BASE_PATH = "/api/v1";

export interface ApiErrorBody {
  code: string;
  field?: string;
  message: string;
}

/** Thrown for any non-2xx response. Carries the parsed error envelope when present. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field?: string;

  constructor(status: number, body: Partial<ApiErrorBody> | undefined) {
    super(body?.message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code ?? "unknown_error";
    this.field = body?.field;
  }
}

export interface RequestOptions {
  /** HTTP method. Defaults to GET. */
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Plain object serialized as a JSON body. */
  body?: unknown;
  /** Extra headers merged onto the defaults. */
  headers?: Record<string, string>;
  /** Optional abort signal for cancellation / timeouts. */
  signal?: AbortSignal;
}

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_PATH}${normalized}`;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Perform a JSON request against the backend API.
 *
 * @typeParam T - expected shape of the successful response body.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers, signal } = options;

  const init: RequestInit = {
    method,
    // Always send the session cookie on same-origin API calls.
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    signal,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), init);
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const envelope =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error: Partial<ApiErrorBody> }).error
        : undefined;
    throw new ApiError(response.status, envelope);
  }

  return payload as T;
}

export const api = {
  get: <T = unknown>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  del: <T = unknown>(path: string, options?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};

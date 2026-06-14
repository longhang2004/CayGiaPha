import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, apiRequest } from "./apiClient";

function mockFetch(response: {
  ok: boolean;
  status: number;
  body?: unknown;
}) {
  const fetchMock = vi.fn(async () => {
    return {
      ok: response.ok,
      status: response.status,
      text: async () =>
        response.body === undefined ? "" : JSON.stringify(response.body),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("targets the /api/v1 prefix and always includes credentials (session cookie)", async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, body: { ok: true } });

    await apiRequest("/persons");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/persons");
    expect(init.credentials).toBe("include");
  });

  it("serializes a JSON body and sets the content-type on POST", async () => {
    const fetchMock = mockFetch({ ok: true, status: 201, body: { id: "p1" } });

    const result = await api.post<{ id: string }>("/persons", {
      displayName: "Anh",
      gender: "male",
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ displayName: "Anh", gender: "male" }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(result).toEqual({ id: "p1" });
  });

  it("throws a typed ApiError carrying the backend error envelope", async () => {
    mockFetch({
      ok: false,
      status: 400,
      body: { error: { code: "validation_error", field: "displayName", message: "too long" } },
    });

    await expect(apiRequest("/persons", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 400,
      code: "validation_error",
      field: "displayName",
    });
  });

  it("falls back to a generic ApiError when no envelope is present", async () => {
    mockFetch({ ok: false, status: 500 });

    const error = (await apiRequest("/persons").catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(500);
    expect(error.code).toBe("unknown_error");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// apiFetch is in utils.ts — import directly
// We need to test it without the Next.js/browser environment
// so we mock global fetch

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after stubbing global
const { apiFetch } = await import("@/lib/utils");

describe("apiFetch", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("성공 응답(200)이면 JSON을 반환한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: 1 } }),
    });
    const result = await apiFetch("/api/test");
    expect(result).toEqual({ success: true, data: { id: 1 } });
  });

  it("HTTP 에러(500)이면 에러를 던진다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "서버 오류" } }),
    });
    await expect(apiFetch("/api/test")).rejects.toThrow("서버 오류");
  });

  it("success:false 응답이면 에러를 던진다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: { message: "유효하지 않은 요청" } }),
    });
    await expect(apiFetch("/api/test")).rejects.toThrow("유효하지 않은 요청");
  });

  it("HTTP 에러 시 메시지가 없으면 상태 코드로 메시지를 만든다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => null,
    });
    await expect(apiFetch("/api/test")).rejects.toThrow("서버 오류 (404)");
  });

  it("options를 fetch에 그대로 전달한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await apiFetch("/api/test", { method: "POST", headers: { "Content-Type": "application/json" } });
    expect(mockFetch).toHaveBeenCalledWith("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  });
});

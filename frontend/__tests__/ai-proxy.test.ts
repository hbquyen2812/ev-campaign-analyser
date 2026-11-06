// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyAiRequest } from "@/lib/server/ai-proxy";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function post(path = "predict") {
  return new Request(`http://localhost:3000/api/ai/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "An EV campaign", source: "x", model: "legacy" }),
  });
}

describe("server-side AI proxy", () => {
  it("forwards the body and server token without returning that token", async () => {
    vi.stubEnv("AI_SERVER_URL", "http://localhost:8100/");
    vi.stubEnv("AI_SERVER_TOKEN", "private-test-token");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ viral_score: 0.42 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxyAiRequest(post(), ["predict"]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.toString()).toBe("http://localhost:8100/predict");
    expect(options.headers.Authorization).toBe("Bearer private-test-token");
    expect(JSON.parse(options.body).model).toBe("legacy");
    expect(options.redirect).toBe("error");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.has("Authorization")).toBe(false);
    expect(await response.text()).not.toContain("private-test-token");
  });

  it("preserves a missing queue response so the client can fall back to /report", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "Not Found" }, { status: 404 })));
    const response = await proxyAiRequest(post("report/jobs"), ["report", "jobs"]);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ detail: "Not Found" });
  });

  it("does not proxy arbitrary paths or traversal", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const segments of [["admin"], ["..", "predict"], ["report", "jobs", ".."]]) {
      expect((await proxyAiRequest(post(), segments)).status).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports health and report polling without forwarding browser authorization", async () => {
    vi.stubEnv("AI_SERVER_TOKEN", "");
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ status: "ok" })));
    vi.stubGlobal("fetch", fetchMock);
    for (const path of [["health"], ["report", "jobs", "job_123-abc"]]) {
      const request = new Request(`http://localhost/api/ai/${path.join("/")}`, {
        headers: { Authorization: "Bearer untrusted-browser-token" },
      });
      expect((await proxyAiRequest(request, path)).status).toBe(200);
    }
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it("preserves backend authentication failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "Unauthorized" }, { status: 401 })));
    expect((await proxyAiRequest(post(), ["predict"])).status).toBe(401);
  });

  it("returns a sanitized connection error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private-infrastructure-detail")));
    const response = await proxyAiRequest(post(), ["predict"]);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private-infrastructure-detail");
  });

  it("distinguishes upstream timeouts from connection failures", async () => {
    const error = new Error("timeout");
    error.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    expect((await proxyAiRequest(post(), ["predict"])).status).toBe(504);
  });

  it("rejects invalid upstream configuration before sending credentials", async () => {
    vi.stubEnv("AI_SERVER_URL", "file:///private");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await proxyAiRequest(post(), ["predict"])).status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

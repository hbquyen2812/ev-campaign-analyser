// Imported only by the server route. Do not import this module into client components.
const POST_PATHS = new Set([
  "predict", "predict/batch", "report", "report/jobs",
  "barriers", "greenwashing", "sentiment",
]);
const UPSTREAM_TIMEOUT_MS = 290_000;

function jsonError(status: number, detail: string): Response {
  return Response.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function proxyAiRequest(request: Request, segments: string[]): Promise<Response> {
  const path = segments.join("/");
  const allowed = request.method === "POST"
    ? POST_PATHS.has(path)
    : request.method === "GET" && (path === "health" || /^report\/jobs\/[A-Za-z0-9_-]+$/.test(path));
  if (!allowed) return jsonError(404, "Unsupported AI endpoint.");

  let upstream: URL;
  try {
    const base = (process.env.AI_SERVER_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
    upstream = new URL(`${base}/${path}`);
    if (!["http:", "https:"].includes(upstream.protocol) || upstream.username || upstream.password) {
      throw new Error("Invalid upstream URL");
    }
  } catch {
    return jsonError(500, "AI_SERVER_URL must be a valid HTTP or HTTPS server URL.");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env.AI_SERVER_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    return jsonError(timedOut ? 504 : 502, timedOut
      ? "The AI server took too long to respond."
      : "The AI server is unreachable. Check AI_SERVER_URL and the backend process.");
  }
}

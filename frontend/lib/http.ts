// Browser-side transport. Backend credentials stay in the Next.js server route.
const API_URL = "/api/ai";
const REQUEST_TIMEOUT_MS = 5 * 60 * 1_000;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ApiError(response.status, `API ${response.status}: ${detail || response.statusText}`);
  }
  return response.json();
}

const asPost = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(`${API_URL}${path}`, asPost(body));
}

export function getJson<T>(path: string): Promise<T> {
  return requestJson<T>(`${API_URL}${path}`, { method: "GET" });
}

/**
 * POST to one of our own Next.js routes. Those run the model from the server
 * directly, so they sit outside the /api/ai proxy to the Python service.
 */
export function postAppJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, asPost(body));
}

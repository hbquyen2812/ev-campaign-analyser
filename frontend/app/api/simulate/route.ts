import { simulateAudience } from "@/lib/simulate";
import { llmConfigured } from "@/lib/llm";
import { SIMULATION_FIXTURE } from "@/lib/fixtures/simulation";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Lang } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Three persona calls in parallel: 4.8s typical, but the platform default of 10s
// would cut off a slow one.
export const maxDuration = 60;

const MAX_POST_CHARS = 4_000;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** The sample run, labelled with why it is being shown instead of a real one. */
function fallback(warning: string): Response {
  return json({ ...SIMULATION_FIXTURE, warning });
}

export async function POST(request: Request): Promise<Response> {
  let body: { post?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ detail: "Request body must be JSON." }, 400);
  }

  const post = typeof body.post === "string" ? body.post.trim() : "";
  if (!post) return json({ detail: "post is required." }, 422);
  // Long posts cost tokens on three calls at once; cut rather than refuse, since a
  // pasted article still has a usable opening.
  const trimmed = post.slice(0, MAX_POST_CHARS);
  const lang: Lang = body.lang === "vi" ? "vi" : "en";
  // Charged before the model is touched, so a loop costs nothing.
  const rate = checkRateLimit(request);
  if (!rate.ok) {
    return json({
      detail: rate.scope === "global"
        ? "The demo has reached its hourly limit. Please try again shortly."
        : "Too many requests. Please wait a moment and try again.",
      retryAfterSeconds: rate.retryAfterSeconds,
    }, 429);
  }


  if (!llmConfigured()) return fallback("No model configured; showing a sample run.");

  try {
    return json(await simulateAudience({ post: trimmed, lang }));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    return fallback(`The model is unavailable (${detail}); showing a sample run.`);
  }
}

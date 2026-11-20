import { coachTurn } from "@/lib/coach";
import { llmConfigured } from "@/lib/llm";
import { getPersona } from "@/lib/personas";
import { checkRateLimit } from "@/lib/rate-limit";
import type { CoachResponse, CoachTurn, Lang } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// One model call per turn; the platform default would cut a slow one off mid-answer.
export const maxDuration = 60;

const MAX_TURNS = 40;
const MAX_CHARS = 1_500;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Keep the lesson going without a model: the trust bar and the rubric still work.
 *
 * Mid-conversation the customer says nothing at all. Opening again on turn five reads
 * as the customer forgetting the last four answers, which is worse than a visible
 * warning and no reply — and the page already skips an empty one.
 */
function fallback(
  personaId: string,
  trust: number,
  lang: Lang,
  warning: string,
  started: boolean,
): Response {
  const persona = getPersona(personaId);
  const questions = persona?.openingQuestions[lang] ?? persona?.openingQuestions.vi ?? [];
  const body: CoachResponse = {
    reply: started ? "" : (questions[0] ?? ""),
    trust,
    trustDelta: 0,
    strengths: [],
    weaknesses: [],
    feedback: "",
    modelAnswer: "",
    backend: "template",
    warning,
  };
  return json(body);
}

export async function POST(request: Request): Promise<Response> {
  let body: { personaId?: unknown; history?: unknown; trust?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ detail: "Request body must be JSON." }, 400);
  }

  const personaId = typeof body.personaId === "string" ? body.personaId : "";
  const persona = getPersona(personaId);
  if (!persona) return json({ detail: "Unknown personaId." }, 422);

  const history: CoachTurn[] = (Array.isArray(body.history) ? body.history : [])
    .filter((t): t is CoachTurn =>
      !!t && (t.role === "customer" || t.role === "seller") && typeof t.text === "string")
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_CHARS) }))
    .slice(-MAX_TURNS);

  const lang: Lang = body.lang === "vi" ? "vi" : "en";
  const rawTrust = typeof body.trust === "number" ? body.trust : persona.trust.start;
  const trust = Math.min(100, Math.max(0, Math.round(rawTrust)));

  // Whether the lesson is under way, which decides if a silent fallback is right.
  const started = history.some((t) => t.role === "seller");
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


  if (!llmConfigured()) {
    return fallback(personaId, trust, lang, "No model configured; the customer cannot reply.", started);
  }

  try {
    return json(await coachTurn({ personaId, history, trust, lang }));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    return fallback(personaId, trust, lang, `The model is unavailable (${detail}).`, started);
  }
}

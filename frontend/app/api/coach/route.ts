import { coachTurn } from "@/lib/coach";
import { llmConfigured } from "@/lib/llm";
import { getPersona } from "@/lib/personas";
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

/** Keep the lesson going without a model: the trust bar and the rubric still work. */
function fallback(personaId: string, trust: number, lang: Lang, warning: string): Response {
  const persona = getPersona(personaId);
  const questions = persona?.openingQuestions[lang] ?? [];
  const body: CoachResponse = {
    reply: questions[0] ?? "",
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

  if (!llmConfigured()) {
    return fallback(personaId, trust, lang, "No model configured; the customer cannot reply.");
  }

  try {
    return json(await coachTurn({ personaId, history, trust, lang }));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    return fallback(personaId, trust, lang, `The model is unavailable (${detail}).`);
  }
}

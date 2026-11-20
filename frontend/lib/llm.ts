// Server-only gateway to the chat model. Never import this from a client component:
// it reads OPENAI_API_KEY, which must not reach the browser.
//
// Deliberately small. Callers get one JSON object back or an exception, and every
// caller is expected to have a deterministic fallback — on demo day an unreachable
// model must cost a nicer screen, not the whole page.

// Measured on the three-persona run: gpt-4o-mini 4.8s, gpt-5-mini 44s, gpt-5-nano 60s
// and three comments short. Role-play in two sentences needs no reasoning budget, and
// a demo that makes the room wait 44 seconds has already lost it.
const DEFAULT_MODEL = "gpt-4o-mini";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 60_000;

export class LlmUnavailable extends Error {}

export const llmConfigured = (): boolean => Boolean(process.env.OPENAI_API_KEY?.trim());

export const llmModel = (): string => process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface LlmJsonResult<T> {
  data: T;
  usage: LlmUsage;
}

/**
 * Ask the model for one JSON object.
 *
 * No retry loop on purpose: a retrying generator is how a demo account burns its
 * credit at 3am. One attempt, one timeout, then the caller falls back.
 */
export async function completeJson<T>(prompt: string): Promise<LlmJsonResult<T>> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new LlmUnavailable("OPENAI_API_KEY is not set");

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: llmModel(),
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    throw new LlmUnavailable(timedOut ? "The model timed out" : "The model is unreachable");
  }

  if (!response.ok) {
    // Surface the status: 401 is a bad key, 429 is quota or rate limit, and those
    // need different fixes from the operator.
    const detail = await response.text().catch(() => "");
    throw new LlmUnavailable(`Model call failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new LlmUnavailable("The model returned an empty response");
  }

  let data: T;
  try {
    data = JSON.parse(content) as T;
  } catch {
    throw new LlmUnavailable("The model returned text that is not JSON");
  }

  return {
    data,
    usage: {
      promptTokens: payload?.usage?.prompt_tokens ?? 0,
      completionTokens: payload?.usage?.completion_tokens ?? 0,
    },
  };
}

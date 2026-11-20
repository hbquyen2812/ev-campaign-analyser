// Audience simulation: the post goes to each persona in turn, and what comes back
// is the comment list plus the three readings the result screen shows —
// the reaction split, the comment to answer first, and a reply for every comment.

import { completeJson, LlmUnavailable } from "@/lib/llm";
import { buildPersonaPrompt, allowedNumberSources, PERSONAS } from "@/lib/personas";
import { buildAllowedNumbers, redactUnsupportedNumbers } from "@/lib/numeric-guard";
import type {
  Lang, Persona, ReactionKind, SimulatedComment, SimulationResponse,
} from "@/lib/types";

// Ten comments over three personas, as the result screen is specified.
const COMMENTS_PER_PERSONA: Record<string, number> = {
  "tinh-toan": 3,
  "lo-ngap": 3,
  "sinh-vien": 4,
};
const DEFAULT_COUNT = 3;
const REACTIONS: ReactionKind[] = ["positive", "skeptical", "negative"];

interface RawComment {
  comment?: unknown;
  reaction?: unknown;
  risk?: unknown;
  suggestedReply?: unknown;
}

const asText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function asReaction(value: unknown): ReactionKind {
  return REACTIONS.includes(value as ReactionKind) ? (value as ReactionKind) : "skeptical";
}

function asRisk(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

/**
 * Reaction shares in whole percent that still add up to 100.
 *
 * Rounding each share on its own gives 33/33/33 and a result screen that visibly
 * fails to sum, so the leftover points go to the largest remainders.
 */
export function reactionMix(comments: SimulatedComment[]): Record<ReactionKind, number> {
  const mix = { positive: 0, skeptical: 0, negative: 0 };
  if (comments.length === 0) return mix;

  const counts = REACTIONS.map((r) => comments.filter((c) => c.reaction === r).length);
  const exact = counts.map((n) => (n * 100) / comments.length);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);

  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of order) {
    if (left <= 0) break;
    floors[index] += 1;
    left -= 1;
  }

  REACTIONS.forEach((r, i) => { mix[r] = floors[i]; });
  return mix;
}

/**
 * The comment to answer first: the one most likely to be echoed, among those that
 * are not praise. Praise never needs damage control, however loud it is.
 */
export function pickTopRisk(comments: SimulatedComment[]): SimulatedComment | null {
  const critical = comments.filter((c) => c.reaction !== "positive");
  if (critical.length === 0) return null;
  return critical.reduce((worst, c) => (c.risk > worst.risk ? c : worst));
}

async function runPersona(
  persona: Persona,
  post: string,
  lang: Lang,
): Promise<SimulatedComment[]> {
  const count = COMMENTS_PER_PERSONA[persona.id] ?? DEFAULT_COUNT;
  const prompt = buildPersonaPrompt({ persona, post, lang, count });
  const { data } = await completeJson<{ comments?: RawComment[] }>(prompt);

  // The guard covers the suggested reply only. A commenter repeating a wrong figure
  // from the post is the very thing the tool is meant to surface, so leave that be.
  //
  // The reply is stripped of every figure, not merely unsupported ones: the spec sheet
  // backing them is placeholder data, so "it wades up to 30 cm" passes the check and is
  // still a number no one verified, sitting in the line a marketer is most likely to
  // paste under their own post. The brief wrote this example with blanks in it too.
  const allowed = buildAllowedNumbers([]);

  return (Array.isArray(data.comments) ? data.comments : [])
    .map((raw): SimulatedComment | null => {
      const comment = asText(raw.comment);
      const reply = asText(raw.suggestedReply);
      if (!comment) return null;

      const guarded = redactUnsupportedNumbers(reply, allowed);
      return {
        personaId: persona.id,
        personaName: persona.name[lang],
        comment,
        reaction: asReaction(raw.reaction),
        risk: asRisk(raw.risk),
        suggestedReply: guarded.text,
        ...(guarded.redacted.length > 0
          ? { redactedNumbers: guarded.redacted.map((n) => n.raw) }
          : {}),
      };
    })
    .filter((c): c is SimulatedComment => c !== null)
    .slice(0, count);
}

export interface SimulateInput {
  post: string;
  lang: Lang;
}

/**
 * Run every persona against the post. One persona failing costs its comments, not
 * the whole run; only a total failure is raised, so the caller can serve the sample.
 */
export async function simulateAudience({ post, lang }: SimulateInput): Promise<SimulationResponse> {
  const settled = await Promise.allSettled(
    PERSONAS.map((persona) => runPersona(persona, post, lang)),
  );

  const comments = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (comments.length === 0) {
    const reason = settled.find((r) => r.status === "rejected");
    const detail = reason && reason.status === "rejected" ? String(reason.reason?.message ?? reason.reason) : "no comments generated";
    throw new LlmUnavailable(detail);
  }

  const failed = settled.filter((r) => r.status === "rejected").length;
  return {
    comments,
    mix: reactionMix(comments),
    topRisk: pickTopRisk(comments),
    backend: "llm",
    ...(failed > 0
      ? { warning: `${failed} of ${PERSONAS.length} personas did not answer; showing the rest` }
      : {}),
  };
}

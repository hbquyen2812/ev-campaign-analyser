// Sales practice: a persona plays the customer, the trainee answers, and the trust
// bar moves.
//
// The model judges the answer against a fixed rubric; the arithmetic on the bar is
// ours. Asking a model for "trust: 42%" gives a number that wanders between
// identical answers and cannot be explained to the person being trained.

import { completeJson, LlmUnavailable } from "@/lib/llm";
import { allowedNumberSources, getPersona, specSheetLines } from "@/lib/personas";
import { buildAllowedNumbers, findUnsupportedNumbers, redactUnsupportedNumbers } from "@/lib/numeric-guard";
import type {
  CoachResponse, CoachStrength, CoachTurn, CoachWeakness, Lang, Persona,
} from "@/lib/types";

const STRENGTHS: CoachStrength[] = ["number", "admits-limit", "specific", "empathy", "practical"];
const WEAKNESSES: CoachWeakness[] = ["vague", "hype", "dismissive", "upsell"];

// Calibrated against the worked example in the brief: the flood worrier starts at
// 30, a vague answer drops her to 25, and a specific, honest one lifts her to 60.
// One weakness at -5 gives 25; three strengths she cares about at +12 give 61.
const PER_MATCHED_STRENGTH = 12;
// Strengths outside this persona's list still count, at half. Being specific helps
// with anyone; scoring it zero made a good, figure-carrying answer lower the bar.
const PER_OTHER_STRENGTH = 6;
const PER_WEAKNESS = 5;
// Quoting a figure the spec sheet does not carry is worse than saying nothing: it is
// the one mistake a customer can catch you out on later.
const PER_INVENTED_FIGURE = 8;

export const TRUST_MIN = 0;
export const TRUST_MAX = 100;

export interface CoachScore {
  strengths: CoachStrength[];
  weaknesses: CoachWeakness[];
  feedback: string;
  modelAnswer: string;
  reply: string;
}

/**
 * Move the bar. Only what the persona actually cares about counts — a number means
 * little to someone whose worry is where to park and charge.
 */
export function applyTrust(
  persona: Persona,
  current: number,
  score: { strengths: CoachStrength[]; weaknesses: CoachWeakness[] },
  inventedFigures: number,
): { trust: number; delta: number } {
  const matched = score.strengths.filter((s) => persona.trust.rewards.includes(s));
  const other = score.strengths.filter((s) => !persona.trust.rewards.includes(s));
  const penalised = score.weaknesses.filter((w) => persona.trust.punishes.includes(w));

  const raw = current
    + matched.length * PER_MATCHED_STRENGTH
    + other.length * PER_OTHER_STRENGTH
    - penalised.length * PER_WEAKNESS
    - inventedFigures * PER_INVENTED_FIGURE;

  const trust = Math.round(Math.min(TRUST_MAX, Math.max(TRUST_MIN, raw)));
  return { trust, delta: trust - current };
}

const asList = <T extends string>(value: unknown, allowed: T[]): T[] =>
  Array.isArray(value) ? (value.filter((v) => allowed.includes(v as T)) as T[]) : [];

// Strengths a given weakness contradicts outright.
//
// "vague" denies every strength we cannot verify ourselves. The model is a generous
// marker: handed the brief's own bad example — "Don't worry, it runs just fine" — it
// called the answer vague and then awarded it specific, and on the next run
// admits-limit, each time lifting a bar that should have dropped. An answer with
// nothing in it demonstrated nothing, so only "number" survives, and that one is
// decided by reading the text rather than by asking.
const CONTRADICTS: Partial<Record<CoachWeakness, CoachStrength[]>> = {
  vague: ["specific", "empathy", "practical", "admits-limit"],
  dismissive: ["empathy"],
};

/**
 * The model answer, or coaching in its place.
 *
 * Three outcomes, by how much of the answer the sheet actually backs:
 *   nothing removed          -> show it as written;
 *   removed, but a sheet
 *   figure still stands      -> show it with the stray figure blanked;
 *   removed, nothing left    -> the sheet cannot answer this, so teach the move.
 *
 * The middle case matters: replacing wholesale threw away a correct "replacement
 * costs 12.000.000 đ" because the model had tacked one stray year onto the end.
 */
export function guardedModelAnswer(
  answer: string,
  allowed: ReturnType<typeof buildAllowedNumbers>,
  lang: Lang,
): string {
  if (!answer) return "";
  const { text, redacted } = redactUnsupportedNumbers(answer, allowed);
  if (redacted.length === 0) return answer;

  const significant = findUnsupportedNumbers(answer, []);
  const hasSupportedFigure = significant.length > redacted.length;
  return hasSupportedFigure ? text : NO_FIGURE_GUIDANCE[lang];
}

/** Drop strengths the verdict's own weaknesses rule out. The weakness is believed. */
export function resolveContradictions(
  strengths: CoachStrength[],
  weaknesses: CoachWeakness[],
): CoachStrength[] {
  const denied = new Set(weaknesses.flatMap((w) => CONTRADICTS[w] ?? []));
  return strengths.filter((s) => !denied.has(s));
}

const asText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

// What to show instead of a model answer whose figures had to be blanked.
//
// Blanking alone leaves "total cost over … years is 35.000.000 đ + … đ", which reads
// worse than the invention did and still dodges the question. When the sheet has no
// answer, the thing worth teaching is how to say so.
const NO_FIGURE_GUIDANCE: Record<Lang, string> = {
  vi: "Bảng thông số không có số cho câu hỏi này. Cách trả lời đúng: nói thẳng là chưa có số liệu, "
    + "nêu con số liên quan mà bảng CÓ, rồi xin thông tin của khách để gửi lại số chính xác. "
    + "Đừng nhẩm ra một con số — khách sẽ kiểm chứng được.",
  en: "The spec sheet has no figure for this question. The right move: say so plainly, quote the "
    + "related figure the sheet does carry, then offer to follow up with an exact number. "
    + "Never work one out on the spot — the customer can check it later.",
};

const SHAPE = '{"reply":"...","strengths":["number"],"weaknesses":["vague"],"feedback":"...","modelAnswer":"..."}';

function buildCoachPrompt(persona: Persona, history: CoachTurn[], lang: Lang): string {
  const transcript = history
    .map((t) => `${t.role === "customer" ? persona.name[lang] : (lang === "vi" ? "Người bán" : "Seller")}: ${t.text}`)
    .join("\n");

  const vi = [
    `Bạn đang đóng vai ${persona.name[lang]}, một khách hàng thật đang hỏi mua xe máy điện.`,
    `Hoàn cảnh: ${persona.situation[lang]}`,
    `Quan tâm nhất: ${persona.concerns[lang]}`,
    `Cách nói: ${persona.voice[lang]}`,
    "",
    "## BẢNG THÔNG SỐ — nguồn số duy nhất được phép dùng",
    ...specSheetLines(lang),
    "",
    "## CUỘC TRÒ CHUYỆN",
    transcript,
    "",
    "## VIỆC CỦA BẠN",
    "1. reply: câu hỏi tiếp theo của khách, tối đa 2 câu, đúng giọng nhân vật. Nếu người bán trả lời tốt thì tỏ ra bớt nghi ngờ.",
    `2. strengths: chọn trong ${JSON.stringify(STRENGTHS)} — câu trả lời vừa rồi làm được gì. Mảng rỗng nếu không được gì.`,
    "Trấn an suông mà không có con số thì KHÔNG phải empathy và KHÔNG phải specific — đó là vague. Chỉ cho empathy khi người bán gọi đúng tên nỗi lo của khách.",
    `3. weaknesses: chọn trong ${JSON.stringify(WEAKNESSES)} — câu trả lời vừa rồi dở chỗ nào.`,
    "4. feedback: MỘT câu nhận xét ngắn cho người bán, nói thẳng hay ở đâu dở ở đâu.",
    "5. modelAnswer: câu trả lời mẫu tốt hơn, có con số lấy từ bảng thông số và nói thật về giới hạn.",
    "Tuyệt đối không bịa số ngoài bảng thông số, và KHÔNG được tính ra số mới từ các số trong bảng "
      + "(không nhân phần trăm, không cộng trừ, không suy ra giá bán lại hay chi phí nhiều năm). "
      + "Không có số sẵn cho câu hỏi đó thì nói thẳng là chưa có số liệu.",
    "Chỉ trả về JSON đúng dạng:",
    SHAPE,
  ];

  const en = [
    `You are playing ${persona.name[lang]}, a real customer asking about an electric motorbike.`,
    `Situation: ${persona.situation[lang]}`,
    `Cares most about: ${persona.concerns[lang]}`,
    `Way of speaking: ${persona.voice[lang]}`,
    "",
    "## SPEC SHEET — the only figures you may use",
    ...specSheetLines(lang),
    "",
    "## CONVERSATION",
    transcript,
    "",
    "## YOUR JOB",
    "1. reply: the customer's next question, at most two sentences, in character. Sound less sceptical if the seller answered well.",
    `2. strengths: pick from ${JSON.stringify(STRENGTHS)} — what the seller's last answer got right. Empty array if nothing.`,
    "Bare reassurance with no figure is NOT empathy and NOT specific — it is vague. Award empathy only when the seller names the worry the customer actually raised.",
    `3. weaknesses: pick from ${JSON.stringify(WEAKNESSES)} — what it got wrong.`,
    "4. feedback: ONE short sentence of coaching for the seller, blunt about what worked and what did not.",
    "5. modelAnswer: a better answer, carrying a figure from the spec sheet and honest about limits.",
    "Never invent a figure that is not on the spec sheet, and never WORK OUT a new one from it "
      + "(no percentages of a price, no sums, no derived resale values or multi-year costs). "
      + "If no figure on the sheet answers the question, say plainly that you do not have it.",
    "Return JSON only, in exactly this shape:",
    SHAPE,
  ];

  return (lang === "vi" ? vi : en).join("\n");
}

export interface CoachInput {
  personaId: string;
  /** Full conversation so far, ending with the seller's latest answer. */
  history: CoachTurn[];
  /** Trust before this answer. */
  trust: number;
  lang: Lang;
}

export async function coachTurn({ personaId, history, trust, lang }: CoachInput): Promise<CoachResponse> {
  const persona = getPersona(personaId);
  if (!persona) throw new Error(`Unknown persona ${personaId}`);

  const lastSellerLine = [...history].reverse().find((t) => t.role === "seller")?.text ?? "";

  // The trainee is held to the same rule as the model: a figure that is in neither
  // the spec sheet nor the customer's own words is one they invented.
  const allowed = buildAllowedNumbers([
    ...allowedNumberSources(""),
    ...history.filter((t) => t.role === "customer").map((t) => t.text),
  ]);
  const invented = findUnsupportedNumbers(lastSellerLine, allowed);

  const { data } = await completeJson<Record<string, unknown>>(
    buildCoachPrompt(persona, history, lang),
  );

  // "Gave a figure" is checkable, so we check it rather than trust the judgement.
  // Asked to score "Don't worry, it runs fine", the model handed out empathy and the
  // bar went up — on the exact answer the brief uses as its bad example.
  const significant = findUnsupportedNumbers(lastSellerLine, []);
  const quotedASheetFigure = significant.length > invented.length;

  // Evidence beats judgement in both directions: an answer that quotes a figure off
  // the spec sheet is not vague, whatever the marker says. Without this the model kept
  // calling "it wades up to 30 cm, rated IP67, deeper than that please push" vague,
  // which suppressed the rest of its credit and barely moved the bar.
  const weaknesses = asList(data.weaknesses, WEAKNESSES)
    .filter((w) => !(w === "vague" && quotedASheetFigure));

  const judged = resolveContradictions(
    asList(data.strengths, STRENGTHS).filter((s) => s !== "number"),
    weaknesses,
  );
  const strengths = quotedASheetFigure ? (["number", ...judged] as CoachStrength[]) : judged;
  const { trust: next, delta } = applyTrust(persona, trust, { strengths, weaknesses }, invented.length);

  return {
    reply: asText(data.reply) || (persona.openingQuestions[lang]?.[0] ?? ""),
    trust: next,
    trustDelta: delta,
    strengths,
    weaknesses,
    feedback: asText(data.feedback),
    // The one piece of text most likely to be pasted to a real customer, because it
    // is labelled the better answer — so it is guarded hardest. Left unchecked it
    // offered "resale around 24,500,000 đ at 70% of the purchase price": both figures
    // worked out from the sheet rather than read off it. If anything had to go, the
    // sentence is not worth showing; teach the move instead.
    modelAnswer: guardedModelAnswer(asText(data.modelAnswer), allowed, lang),
    ...(invented.length > 0 ? { unsupportedNumbers: invented.map((n) => n.raw) } : {}),
    backend: "llm" as const,
  };
}

export { LlmUnavailable };

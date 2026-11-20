// Persona registry: who the AI plays, and the only numbers it is allowed to quote.
//
// The persona descriptions are written from real Vietnamese EV posts (see
// personas.json -> groundedOn), so every seed quote can be traced back to a post_id
// in annotation_marketing/all_posts_raw.jsonl when someone asks where a persona
// came from.

import type { Lang, Persona } from "@/lib/types";
import personaData from "./personas.json";
import specSheet from "./spec-sheet.json";

export const PERSONAS: Persona[] = personaData.personas as Persona[];
export const PERSONA_CORPUS = personaData.groundedOn;
export const SPEC_SHEET = specSheet;

export const getPersona = (id: string): Persona | undefined =>
  PERSONAS.find((p) => p.id === id);

export const personaName = (id: string, lang: Lang): string =>
  getPersona(id)?.name[lang] ?? id;

/** Spec sheet as prompt lines. The illustrative tag travels with the number, always. */
export function specSheetLines(lang: Lang): string[] {
  const tag = lang === "vi" ? "(số minh họa)" : "(illustrative)";
  return SPEC_SHEET.items.map((item) => {
    const unit = item.unit ? ` ${item.unit}` : "";
    const note = item.illustrative ? ` ${tag}` : "";
    return `- ${item.label[lang]}: ${item.value}${unit}${note}`;
  });
}

/**
 * The texts the numeric guard treats as ground truth: the spec sheet, plus the post
 * being analysed. A number outside these was invented by the model.
 */
export function allowedNumberSources(postText: string): string[] {
  const sheet = SPEC_SHEET.items.map((i) => `${i.value} ${i.unit}`.trim());
  return [...sheet, postText];
}

export interface PersonaPromptInput {
  persona: Persona;
  /** The post the user is about to publish. */
  post: string;
  lang: Lang;
  /** How many comments this persona should write. */
  count: number;
}

const RULES: Record<Lang, string[]> = {
  vi: [
    "Viết mọi bình luận và câu trả lời bằng TIẾNG VIỆT.",
    "Viết đúng giọng của nhân vật trên, không viết giọng nhân viên marketing.",
    "Mỗi bình luận tối đa 2 câu, như người thật gõ vội dưới bài đăng.",
    "CHỈ dùng con số có trong bảng thông số hoặc trong chính bài đăng. Không có số phù hợp thì viết chữ, tuyệt đối không bịa số.",
    "suggestedReply là KHUNG câu trả lời của người bán, KHÔNG chứa chữ số nào. Chỗ cần số thì để ngoặc vuông "
      + "ghi rõ cần số gì, ví dụ \"Dạ xe lội nước tối đa [mức lội nước, cm] ạ\". Lịch sự và nói thật về giới hạn. "
      + "Bảng thông số chỉ để biết loại số nào tồn tại, không phải để chép ra.",
    "reaction: \"positive\" nếu khen, \"skeptical\" nếu nghi ngờ hoặc hỏi vặn, \"negative\" nếu chê.",
    "Nếu bài đăng trả lời trúng nỗi lo lớn nhất của nhân vật, hãy để họ khen thật lòng. Đừng ép mọi bình luận đều phải nghi ngờ.",
    "risk: 0 đến 1, ước lượng khả năng người khác vào hùa theo bình luận này.",
  ],
  en: [
    // The seed quotes stay in Vietnamese on purpose — they carry the voice. Without
    // this first rule the model follows them into Vietnamese and ignores `lang`.
    "Write every comment and reply in ENGLISH, even though the sample comments below are in Vietnamese.",
    "Write in the character's voice, never in a marketer's voice.",
    "At most two sentences per comment, the way a real person types under a post.",
    "ONLY use figures that appear in the spec sheet or in the post itself. If none fits, use words — never invent a number.",
    "suggestedReply is a SKELETON of the seller's answer containing NO digits. Put a square-bracket slot "
      + "wherever a figure belongs, naming what is needed, e.g. \"It wades up to [max wading depth, cm]\". "
      + "Be polite and honest about limits. The spec sheet tells you which kinds of figure exist; it is not "
      + "there to be copied out.",
    "reaction: \"positive\" for praise, \"skeptical\" for doubt or pushback, \"negative\" for criticism.",
    "If the post genuinely answers this character's biggest worry, let them say so. Do not force every comment to be critical.",
    "risk: 0 to 1, how likely other viewers pile onto this comment.",
  ],
};

const HEADINGS: Record<Lang, Record<string, string>> = {
  vi: {
    role: "Bạn đang đóng vai một người xem thật trên mạng xã hội Việt Nam.",
    who: "NHÂN VẬT",
    name: "Tên", age: "Tuổi", life: "Hoàn cảnh", care: "Quan tâm nhất", speak: "Cách nói",
    real: "BÌNH LUẬN THẬT CỦA KIỂU NGƯỜI NÀY (để bắt giọng, đừng chép lại)",
    sheet: "BẢNG THÔNG SỐ SẢN PHẨM — nguồn số duy nhất được phép dùng",
    post: "BÀI ĐĂNG SẮP ĐĂNG",
    rules: "QUY TẮC",
    task: "Viết {count} bình luận nhân vật này sẽ để lại dưới bài đăng trên.",
    out: "Chỉ trả về JSON, không giải thích gì thêm, theo đúng dạng:",
  },
  en: {
    role: "You are playing a real viewer on Vietnamese social media.",
    who: "CHARACTER",
    name: "Name", age: "Age", life: "Situation", care: "Cares most about", speak: "Way of speaking",
    real: "REAL COMMENTS FROM THIS KIND OF PERSON (for voice only, do not copy)",
    sheet: "PRODUCT SPEC SHEET — the only figures you may use",
    post: "THE POST ABOUT TO BE PUBLISHED",
    rules: "RULES",
    task: "Write {count} comments this character would leave under the post above.",
    out: "Return JSON only, no commentary, in exactly this shape:",
  },
};

const SHAPE =
  '{"comments":[{"comment":"...","reaction":"skeptical","risk":0.6,"suggestedReply":"..."}]}';

/** Build the role-play prompt for one persona. */
export function buildPersonaPrompt({ persona, post, lang, count }: PersonaPromptInput): string {
  const h = HEADINGS[lang];
  // The source ids stay in personas.json for traceability but are left out here:
  // a 64-character hash tells the model nothing and costs tokens on every call.
  const quotes = persona.seedQuotes.map((q) => `- "${q.text}"`);
  return [
    h.role,
    "",
    `## ${h.who}`,
    `${h.name}: ${persona.name[lang]}`,
    `${h.age}: ${persona.age}`,
    `${h.life}: ${persona.situation[lang]}`,
    `${h.care}: ${persona.concerns[lang]}`,
    `${h.speak}: ${persona.voice[lang]}`,
    "",
    `## ${h.real}`,
    ...quotes,
    "",
    `## ${h.sheet}`,
    ...specSheetLines(lang),
    "",
    `## ${h.post}`,
    post.trim(),
    "",
    `## ${h.rules}`,
    ...RULES[lang].map((r, i) => `${i + 1}. ${r}`),
    "",
    h.task.replace("{count}", String(count)),
    h.out,
    SHAPE,
  ].join("\n");
}

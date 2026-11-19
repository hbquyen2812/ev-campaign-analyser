// Stops the LLM from inventing product figures.
//
// A persona reply that says "pin bảo hành 8 năm" when the spec sheet says 3 is the
// single worst thing that can happen in a demo, and prompt instructions alone do not
// stop a small model from doing it. So every generated answer is scanned afterwards:
// any quantity that is not in the spec sheet or in the user's own post is reported,
// and can be blanked out before it ever reaches the screen.
//
// Comparison is per unit family, so "35 triệu" matches a spec sheet "35.000.000 đ"
// while "3 năm" never matches "3 cm".

export type UnitClass =
  | "currency" | "percent" | "distance" | "time" | "energy" | "charge" | "voltage" | "count";

interface UnitSpec { cls: UnitClass; scale: number }

// Canonical units: currency -> đồng, distance -> metre, time -> month, energy -> kWh.
const UNITS: Record<string, UnitSpec> = {
  "đ": { cls: "currency", scale: 1 },
  "đồng": { cls: "currency", scale: 1 },
  "vnd": { cls: "currency", scale: 1 },
  "vnđ": { cls: "currency", scale: 1 },
  "nghìn": { cls: "currency", scale: 1e3 },
  "ngàn": { cls: "currency", scale: 1e3 },
  "k": { cls: "currency", scale: 1e3 },
  "tr": { cls: "currency", scale: 1e6 },
  "triệu": { cls: "currency", scale: 1e6 },
  "tỷ": { cls: "currency", scale: 1e9 },
  "tỉ": { cls: "currency", scale: 1e9 },
  "%": { cls: "percent", scale: 1 },
  "km": { cls: "distance", scale: 1e3 },
  "m": { cls: "distance", scale: 1 },
  "cm": { cls: "distance", scale: 1e-2 },
  "mm": { cls: "distance", scale: 1e-3 },
  "năm": { cls: "time", scale: 12 },
  "tháng": { cls: "time", scale: 1 },
  "tuần": { cls: "time", scale: 1 / 4 },
  "ngày": { cls: "time", scale: 1 / 30 },
  "giờ": { cls: "time", scale: 1 / 720 },
  "h": { cls: "time", scale: 1 / 720 },
  "phút": { cls: "time", scale: 1 / 43200 },
  "kwh": { cls: "energy", scale: 1 },
  "wh": { cls: "energy", scale: 1e-3 },
  "ah": { cls: "charge", scale: 1 },
  "v": { cls: "voltage", scale: 1 },
};

export interface NumberMention {
  /** Exactly as written, unit included: "35 triệu". */
  raw: string;
  /** Digits only, as written: "35". */
  digits: string;
  /** Unit as written, "" when the number is bare. */
  unit: string;
  unitClass: UnitClass;
  /** Canonical value for its unit family. */
  value: number;
  start: number;
  end: number;
}

// A number, then optionally a unit word. The unit is only claimed when it is a known
// one, so "3 lý do" stays a bare count instead of swallowing "lý".
const NUMBER_RE = /(\d+(?:[.,]\d+)*)\s*(%|\p{L}{1,6})?/gu;

/**
 * Read a Vietnamese-formatted number. Dots group thousands (35.000.000), a comma
 * before one or two digits is a decimal mark (1,1), and anything else is stripped.
 */
export function parseVnNumber(input: string): number {
  const s = input.trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));
  if (/^\d{1,3}(,\d{3})+$/.test(s)) return Number(s.replace(/,/g, ""));
  if (/^\d+,\d{1,2}$/.test(s)) return Number(s.replace(",", "."));
  if (/^\d+\.\d{1,2}$/.test(s)) return Number(s);
  return Number(s.replace(/[.,]/g, ""));
}

/** Every quantity mentioned in `text`, in order. */
export function extractNumbers(text: string): NumberMention[] {
  const out: NumberMention[] = [];
  NUMBER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUMBER_RE.exec(text)) !== null) {
    const digits = m[1];
    const word = (m[2] ?? "").toLowerCase();
    const spec = UNITS[word];
    const unit = spec ? (m[2] as string) : "";
    const amount = parseVnNumber(digits);
    if (!Number.isFinite(amount)) continue;
    const end = spec ? m.index + m[0].length : m.index + digits.length;
    out.push({
      raw: text.slice(m.index, end),
      digits,
      unit,
      unitClass: spec ? spec.cls : "count",
      value: spec ? amount * spec.scale : amount,
      start: m.index,
      end,
    });
  }
  return out;
}

/** Quantities the model is allowed to repeat: the spec sheet plus the user's own post. */
export function buildAllowedNumbers(sources: string[]): NumberMention[] {
  return sources.flatMap((s) => extractNumbers(s));
}

// Bare small integers are list markers ("2 lý do"), bare 1900-2100 are years. Neither
// is a product claim, and flagging them would bury the real findings in noise.
function isHarmless(n: NumberMention): boolean {
  if (n.unitClass !== "count") return false;
  if (Number.isInteger(n.value) && n.value <= 12) return true;
  return n.value >= 1900 && n.value <= 2100;
}

function isSupported(n: NumberMention, allowed: NumberMention[]): boolean {
  return allowed.some((a) => {
    if (a.unitClass !== n.unitClass) return false;
    const tolerance = Math.max(Math.abs(a.value), Math.abs(n.value)) * 0.01;
    return Math.abs(a.value - n.value) <= tolerance;
  });
}

/** Quantities in `text` that no source backs up — i.e. the model made them up. */
export function findUnsupportedNumbers(text: string, allowed: NumberMention[]): NumberMention[] {
  return extractNumbers(text).filter((n) => !isHarmless(n) && !isSupported(n, allowed));
}

/**
 * Blank out every unsupported quantity, keeping its unit: "bảo hành 8 năm" becomes
 * "bảo hành … năm". A gap reads as an honest unknown; a wrong number does not.
 */
export function redactUnsupportedNumbers(
  text: string,
  allowed: NumberMention[],
): { text: string; redacted: NumberMention[] } {
  const bad = findUnsupportedNumbers(text, allowed);
  let out = text;
  // Back to front, so earlier offsets stay valid as the string changes length.
  for (let i = bad.length - 1; i >= 0; i--) {
    const n = bad[i];
    out = out.slice(0, n.start) + "…" + out.slice(n.start + n.digits.length);
  }
  return { text: out, redacted: bad };
}

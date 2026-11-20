// Spending brake for the public routes.
//
// Every model-backed route is open to anyone holding the link, and each simulate
// call spends three OpenAI requests. The account-level cap is the real ceiling, but
// it is monthly and org-wide: hitting it takes the whole organisation offline until
// the reset. This stops a loop long before that.
//
// Counting lives in memory, so each serverless instance counts alone and the true
// limit is the stated one times the number of warm instances. That is fine for what
// this defends against — a script hammering one URL, not a distributed attack.

interface Window {
  count: number;
  resetAt: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// Per caller: generous enough that nobody demoing notices, mean enough to stop a loop.
const PER_IP_LIMIT = 10;
// Across everyone: a hard stop of our own, since the OpenAI cap is a blunt instrument.
const GLOBAL_HOURLY_LIMIT = 200;

const perIp = new Map<string, Window>();
const global: Window = { count: 0, resetAt: 0 };

function hit(window: Window, limit: number, period: number, now: number): boolean {
  if (now >= window.resetAt) {
    window.count = 0;
    window.resetAt = now + period;
  }
  window.count += 1;
  return window.count <= limit;
}

/** Best guess at the caller, from whichever proxy header the host sets. */
export function callerKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export interface RateVerdict {
  ok: boolean;
  /** Which ceiling was hit, for the message the caller sees. */
  scope?: "ip" | "global";
  retryAfterSeconds: number;
}

/**
 * Charge one model-backed request against both ceilings.
 *
 * Both are charged even when the first already failed, so a caller cannot probe the
 * global counter for free by exhausting their own allowance first.
 */
export function checkRateLimit(request: Request, now = Date.now()): RateVerdict {
  const key = callerKey(request);
  const window = perIp.get(key) ?? { count: 0, resetAt: 0 };
  perIp.set(key, window);

  const ipOk = hit(window, PER_IP_LIMIT, MINUTE, now);
  const globalOk = hit(global, GLOBAL_HOURLY_LIMIT, HOUR, now);

  // Entries for callers who have gone quiet would otherwise accumulate for the life
  // of the instance; this is cheap and runs only when the map is already large.
  if (perIp.size > 5_000) {
    for (const [k, w] of perIp) if (now >= w.resetAt) perIp.delete(k);
  }

  if (!globalOk) {
    return { ok: false, scope: "global", retryAfterSeconds: Math.ceil((global.resetAt - now) / 1000) };
  }
  if (!ipOk) {
    return { ok: false, scope: "ip", retryAfterSeconds: Math.ceil((window.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Drop all counters. Tests only — instances are never reset in production. */
export function resetRateLimit(): void {
  perIp.clear();
  global.count = 0;
  global.resetAt = 0;
}

import { beforeEach, describe, expect, it } from "vitest";
import { callerKey, checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

const from = (ip: string) =>
  new Request("http://localhost/api/simulate", { headers: { "x-forwarded-for": ip } });

beforeEach(() => resetRateLimit());

describe("callerKey", () => {
  it("takes the first hop of x-forwarded-for", () => {
    // Proxies append their own address; the client is at the front.
    expect(callerKey(from("203.0.113.9, 10.0.0.1"))).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip, then to a shared bucket", () => {
    const realIp = new Request("http://localhost/", { headers: { "x-real-ip": "198.51.100.4" } });
    expect(callerKey(realIp)).toBe("198.51.100.4");
    expect(callerKey(new Request("http://localhost/"))).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("allows a burst, then holds the caller off", () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) expect(checkRateLimit(from("1.1.1.1"), now).ok).toBe(true);

    const blocked = checkRateLimit(from("1.1.1.1"), now);
    expect(blocked.ok).toBe(false);
    expect(blocked.scope).toBe("ip");
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("lets the same caller back in after the minute", () => {
    const now = 2_000_000;
    for (let i = 0; i < 11; i++) checkRateLimit(from("2.2.2.2"), now);
    expect(checkRateLimit(from("2.2.2.2"), now + 61_000).ok).toBe(true);
  });

  it("keeps callers apart", () => {
    const now = 3_000_000;
    for (let i = 0; i < 11; i++) checkRateLimit(from("3.3.3.3"), now);
    expect(checkRateLimit(from("4.4.4.4"), now).ok).toBe(true);
  });

  it("stops everyone once the hourly ceiling is reached", () => {
    const now = 4_000_000;
    // Spread across callers so no single one trips the per-caller limit first.
    for (let i = 0; i < 200; i++) checkRateLimit(from(`10.0.0.${i}`), now);

    const blocked = checkRateLimit(from("10.1.0.1"), now);
    expect(blocked.ok).toBe(false);
    expect(blocked.scope).toBe("global");
  });

  it("charges the global counter even when the caller is already blocked", () => {
    // Otherwise exhausting your own allowance buys free probes of the shared one.
    const now = 5_000_000;
    for (let i = 0; i < 30; i++) checkRateLimit(from("5.5.5.5"), now);
    for (let i = 0; i < 170; i++) checkRateLimit(from(`11.0.0.${i}`), now);

    expect(checkRateLimit(from("11.1.1.1"), now).scope).toBe("global");
  });
});

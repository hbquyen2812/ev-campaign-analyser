import { describe, expect, it } from "vitest";
import { PERSONAS, buildPersonaPrompt, getPersona, specSheetLines } from "@/lib/personas";
import { SIMULATION_FIXTURE } from "@/lib/fixtures/simulation";

describe("persona registry", () => {
  it("ships the three personas the brief asks for", () => {
    expect(PERSONAS.map((p) => p.id)).toEqual(["tinh-toan", "lo-ngap", "sinh-vien"]);
  });

  it("grounds every persona in traceable real quotes", () => {
    // This is the answer to "how do you know the personas match real people?".
    for (const p of PERSONAS) {
      expect(p.seedQuotes.length).toBeGreaterThan(0);
      for (const q of p.seedQuotes) {
        // Comments cite a 64-char interaction_id, posts cite a post_id.
        const pattern = q.kind === "comment" ? /^[0-9a-f]{64}$/ : /^(yt|x|rd)_/;
        expect(q.sourceId).toMatch(pattern);
      }
    }
  });

  it("backs each persona with at least one real reader comment", () => {
    for (const p of PERSONAS) {
      expect(p.seedQuotes.some((q) => q.kind === "comment")).toBe(true);
    }
  });

  it("carries both languages for every displayed field", () => {
    for (const p of PERSONAS) {
      for (const field of [p.name, p.tagline, p.situation, p.voice, p.concerns]) {
        expect(field.vi.length).toBeGreaterThan(0);
        expect(field.en.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("spec sheet", () => {
  it("tags every unverified figure as illustrative, in both languages", () => {
    for (const line of specSheetLines("vi")) expect(line).toContain("(số minh họa)");
    for (const line of specSheetLines("en")) expect(line).toContain("(illustrative)");
  });
});

describe("buildPersonaPrompt", () => {
  const persona = getPersona("lo-ngap")!;
  const prompt = buildPersonaPrompt({ persona, post: "Xe đi 200 km một lần sạc.", lang: "vi", count: 4 });

  it("puts the character, the spec sheet and the post in the prompt", () => {
    expect(prompt).toContain("Chị Lo Ngập");
    expect(prompt).toContain("30 cm");
    expect(prompt).toContain("Xe đi 200 km một lần sạc.");
    expect(prompt).toContain("Viết 4 bình luận");
  });

  it("forbids invented figures", () => {
    expect(prompt).toContain("tuyệt đối không bịa số");
  });
});

describe("simulation fixture", () => {
  it("matches the contract the UI will render", () => {
    expect(SIMULATION_FIXTURE.comments).toHaveLength(10);
    const sum = Object.values(SIMULATION_FIXTURE.mix).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("points topRisk at the riskiest comment", () => {
    const worst = Math.max(...SIMULATION_FIXTURE.comments.map((c) => c.risk));
    expect(SIMULATION_FIXTURE.topRisk?.risk).toBe(worst);
  });
});

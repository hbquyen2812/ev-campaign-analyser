import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTrust, coachTurn, resolveContradictions } from "@/lib/coach";
import { getPersona } from "@/lib/personas";

vi.mock("@/lib/llm", async () => {
  const actual = await vi.importActual<typeof import("@/lib/llm")>("@/lib/llm");
  return { ...actual, completeJson: vi.fn() };
});
const { completeJson } = await import("@/lib/llm");
const mockedComplete = vi.mocked(completeJson);

const floodWorrier = getPersona("lo-ngap")!;
const student = getPersona("sinh-vien")!;

function reply(over: Record<string, unknown> = {}) {
  return {
    data: {
      reply: "And what if the water is deeper?",
      strengths: [], weaknesses: [], feedback: "ok", modelAnswer: "better",
      ...over,
    },
    usage: { promptTokens: 0, completionTokens: 0 },
  };
}

afterEach(() => vi.resetAllMocks());

describe("applyTrust", () => {
  it("reproduces the worked example from the brief", () => {
    // She starts at 30. "Don't worry, it runs fine" is vague: down to 25.
    const vague = applyTrust(floodWorrier, 30, { strengths: [], weaknesses: ["vague"] }, 0);
    expect(vague.trust).toBe(25);

    // Then a figure, an honest limit and some warmth: back up to about 60.
    const good = applyTrust(
      floodWorrier, 25,
      { strengths: ["number", "admits-limit", "empathy"], weaknesses: [] }, 0,
    );
    expect(good.trust).toBe(61);
    expect(good.delta).toBe(36);
  });

  it("weights what this persona cares about, without ignoring the rest", () => {
    // "practical" is one of the student's rewards and not one of the worrier's, so it
    // counts double for him — but it still counts for her. Scoring off-list strengths
    // at zero let a good, figure-carrying answer push the bar down.
    const forWorrier = applyTrust(floodWorrier, 50, { strengths: ["practical"], weaknesses: [] }, 0);
    const forStudent = applyTrust(student, 50, { strengths: ["practical"], weaknesses: [] }, 0);
    expect(forWorrier.delta).toBe(6);
    expect(forStudent.delta).toBe(12);
  });

  it("punishes an invented figure harder than a weak answer", () => {
    const invented = applyTrust(floodWorrier, 50, { strengths: [], weaknesses: [] }, 1);
    const weak = applyTrust(floodWorrier, 50, { strengths: [], weaknesses: ["vague"] }, 0);
    expect(invented.delta).toBeLessThan(weak.delta);
  });

  it("stays inside 0-100", () => {
    const floor = applyTrust(floodWorrier, 2, { strengths: [], weaknesses: ["vague", "dismissive"] }, 0);
    expect(floor.trust).toBe(0);
    const ceiling = applyTrust(
      floodWorrier, 95, { strengths: ["number", "admits-limit", "empathy"], weaknesses: [] }, 0,
    );
    expect(ceiling.trust).toBe(100);
  });
});

describe("coachTurn", () => {
  it("catches a figure the trainee invented", async () => {
    mockedComplete.mockResolvedValue(reply() as never);
    const result = await coachTurn({
      personaId: "lo-ngap",
      history: [
        { role: "customer", text: "Is the battery safe?" },
        { role: "seller", text: "The battery is covered for 8 years." },
      ],
      trust: 50,
      lang: "en",
    });
    // The sheet says 3 years. Trainees get held to the same rule as the model.
    expect(result.unsupportedNumbers).toEqual(["8 years"]);
    expect(result.trustDelta).toBeLessThan(0);
  });

  it("accepts a figure the trainee read off the spec sheet", async () => {
    mockedComplete.mockResolvedValue(reply({ strengths: ["number"] }) as never);
    const result = await coachTurn({
      personaId: "lo-ngap",
      history: [
        { role: "customer", text: "How deep can it wade?" },
        { role: "seller", text: "Up to 30 cm, deeper than that please push it." },
      ],
      trust: 50,
      lang: "en",
    });
    expect(result.unsupportedNumbers).toBeUndefined();
    expect(result.trust).toBe(62);
  });

  it("ignores rubric values the model made up", async () => {
    mockedComplete.mockResolvedValue(
      reply({ strengths: ["empathy", "charming"], weaknesses: ["rude"] }) as never,
    );
    const result = await coachTurn({
      personaId: "lo-ngap", history: [{ role: "seller", text: "hi" }], trust: 40, lang: "en",
    });
    expect(result.strengths).toEqual(["empathy"]);
    expect(result.weaknesses).toEqual([]);
  });

  it("will not let the model claim a figure that was never given", async () => {
    // Scoring the brief's own bad example, the model awarded credit the answer had
    // not earned. Whether a figure was quoted is checkable, so it is checked here.
    mockedComplete.mockResolvedValue(reply({ strengths: ["number", "empathy"] }) as never);
    const result = await coachTurn({
      personaId: "lo-ngap",
      history: [
        { role: "customer", text: "Will it survive a flooded street?" },
        { role: "seller", text: "Don't worry, it runs just fine." },
      ],
      trust: 30,
      lang: "en",
    });
    expect(result.strengths).not.toContain("number");
  });

  it("falls back to an opening question when the model sends no reply", async () => {
    mockedComplete.mockResolvedValue(reply({ reply: "  " }) as never);
    const result = await coachTurn({
      personaId: "lo-ngap", history: [{ role: "seller", text: "hi" }], trust: 40, lang: "vi",
    });
    expect(result.reply).toBe(floodWorrier.openingQuestions.vi![0]);
  });
});

describe("resolveContradictions", () => {
  it("drops a strength the verdict's own weakness rules out", () => {
    // A vague answer keeps only the strength we can verify by reading it.
    expect(resolveContradictions(["specific", "number"], ["vague"])).toEqual(["number"]);
    expect(resolveContradictions(["admits-limit", "empathy"], ["vague"])).toEqual([]);
    expect(resolveContradictions(["empathy"], ["dismissive"])).toEqual([]);
  });

  it("leaves unrelated pairs alone", () => {
    expect(resolveContradictions(["number", "empathy"], ["upsell"])).toEqual(["number", "empathy"]);
  });
});

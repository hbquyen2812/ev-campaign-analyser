import { afterEach, describe, expect, it, vi } from "vitest";
import { pickTopRisk, reactionMix, simulateAudience } from "@/lib/simulate";
import type { ReactionKind, SimulatedComment } from "@/lib/types";

vi.mock("@/lib/llm", async () => {
  const actual = await vi.importActual<typeof import("@/lib/llm")>("@/lib/llm");
  return { ...actual, completeJson: vi.fn() };
});
const { completeJson, LlmUnavailable } = await import("@/lib/llm");
const mockedComplete = vi.mocked(completeJson);

function comment(reaction: ReactionKind, risk: number): SimulatedComment {
  return {
    personaId: "p", personaName: "P", comment: `c${risk}`,
    reaction, risk, suggestedReply: "r",
  };
}

function reply(comments: unknown[]) {
  return { data: { comments }, usage: { promptTokens: 0, completionTokens: 0 } };
}

afterEach(() => vi.resetAllMocks());

describe("reactionMix", () => {
  it("returns whole percentages that add up to 100", () => {
    // 1/1/1 rounds to 33 three times and visibly fails to sum; the leftover point
    // has to land somewhere.
    const mix = reactionMix([comment("positive", 0), comment("skeptical", 0), comment("negative", 0)]);
    expect(mix.positive + mix.skeptical + mix.negative).toBe(100);
  });

  it("counts the comments rather than asking anyone", () => {
    const mix = reactionMix([
      comment("positive", 0), comment("positive", 0),
      comment("skeptical", 0), comment("negative", 0),
    ]);
    expect(mix).toEqual({ positive: 50, skeptical: 25, negative: 25 });
  });

  it("is all zeroes for no comments", () => {
    expect(reactionMix([])).toEqual({ positive: 0, skeptical: 0, negative: 0 });
  });
});

describe("pickTopRisk", () => {
  it("picks the riskiest comment that is not praise", () => {
    // The loud positive must not win: praise never needs answering first.
    const top = pickTopRisk([comment("positive", 0.99), comment("skeptical", 0.4), comment("negative", 0.7)]);
    expect(top?.risk).toBe(0.7);
  });

  it("returns nothing when every comment is praise", () => {
    expect(pickTopRisk([comment("positive", 0.9)])).toBeNull();
  });
});

describe("simulateAudience", () => {
  it("strips every figure from the suggested reply, not just invented ones", async () => {
    mockedComplete.mockResolvedValue(reply([
      { comment: "How long is the warranty?", reaction: "skeptical", risk: 0.5,
        suggestedReply: "Covered for 3 years, and it wades up to 30 cm." },
    ]) as never);

    const result = await simulateAudience({ post: "Our EV goes far.", lang: "en" });
    // Both figures are on the spec sheet, and the sheet is placeholder data — so this
    // is the line a marketer pastes under a real post carrying numbers nobody checked.
    expect(result.comments[0].suggestedReply).not.toMatch(/[0-9]/);
    expect(result.comments[0].redactedNumbers).toEqual(["3 years", "30 cm"]);
  });

  it("leaves the commenter's own wrong figure alone", async () => {
    mockedComplete.mockResolvedValue(reply([
      { comment: "You claim 900 km, really?", reaction: "negative", risk: 0.9, suggestedReply: "Good question." },
    ]) as never);

    const result = await simulateAudience({ post: "Our EV goes far.", lang: "en" });
    // Surfacing that objection is the point of the tool; only the seller's answer is policed.
    expect(result.comments[0].comment).toContain("900 km");
  });

  it("repairs malformed fields instead of dropping the comment", async () => {
    mockedComplete.mockResolvedValue(reply([
      { comment: "Hi", reaction: "furious", risk: 42, suggestedReply: "Hello" },
    ]) as never);

    const [c] = (await simulateAudience({ post: "Post", lang: "en" })).comments;
    expect(c.reaction).toBe("skeptical");
    expect(c.risk).toBe(1);
  });

  it("drops entries with no comment text", async () => {
    mockedComplete.mockResolvedValue(reply([{ comment: "   ", suggestedReply: "x" }]) as never);
    await expect(simulateAudience({ post: "Post", lang: "en" })).rejects.toBeInstanceOf(LlmUnavailable);
  });

  it("keeps the personas that answered when one fails", async () => {
    mockedComplete
      .mockRejectedValueOnce(new LlmUnavailable("boom"))
      .mockResolvedValue(reply([
        { comment: "ok", reaction: "positive", risk: 0.1, suggestedReply: "thanks" },
      ]) as never);

    const result = await simulateAudience({ post: "Post", lang: "en" });
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.warning).toContain("did not answer");
  });

  it("raises when no persona answers, so the caller can serve the sample", async () => {
    mockedComplete.mockRejectedValue(new LlmUnavailable("down"));
    await expect(simulateAudience({ post: "Post", lang: "en" })).rejects.toBeInstanceOf(LlmUnavailable);
  });
});

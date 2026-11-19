export type Source = "youtube" | "x" | "reddit" | "";
export type Lang = "en" | "vi";
export type PredictionModel = "legacy" | "audience-x90";

export interface Factor {
  feature: string;
  label: string;
  value: number | null;
  contribution: number;
  direction: "up" | "down";
}

export interface Prediction {
  viral_score: number;
  label: string;
  confidence: number;
  top_factors: Factor[];
  explanation_text: string;
  suggestions: string[];
  model?: PredictionModel;
}

export interface ReportResponse {
  report: string;
  prediction: Prediction;
}

export type ReportJobStatus = "queued" | "running" | "succeeded" | "failed";
export interface ReportJobResponse {
  job_id: string;
  status: ReportJobStatus;
  position: number | null;
  submitted_at: number;
  started_at: number | null;
  finished_at: number | null;
  result?: ReportResponse;
  error?: string;
}

export type BarrierStatus = "addressed" | "mentioned" | "not_mentioned";
export interface Barrier {
  key: string;
  label: string;
  status: BarrierStatus;
}
export interface BarrierResponse {
  barriers: Barrier[];
  recommend: string[];
}

export type RiskLevel = "low" | "medium" | "high";
export interface GreenwashResponse {
  risk: RiskLevel;
  claims: string[];
  evidence: string[];
  note: string;
}

export type Reaction = "positive" | "neutral" | "skeptical" | "hostile";
export interface SentimentResponse {
  reaction: Reaction;
  note: string;
}

// ---- Persona simulation (audience preview) ----
export type Localized = Record<Lang, string>;

export interface PersonaQuote {
  /** Verbatim excerpt from the EV corpus — this is what grounds the persona. */
  text: string;
  postId: string;
  platform: string;
}

export interface Persona {
  id: string;
  name: Localized;
  tagline: Localized;
  age: string;
  situation: Localized;
  concerns: string[];
  voice: Localized;
  seedQuotes: PersonaQuote[];
  openingQuestions: Partial<Record<Lang, string[]>>;
  /** Starting trust and what moves it — consumed by the sales-coach page. */
  trust: { start: number; rewards: string[]; punishes: string[] };
}

export type ReactionKind = "positive" | "skeptical" | "negative";

export interface SimulatedComment {
  personaId: string;
  personaName: string;
  comment: string;
  reaction: ReactionKind;
  /** 0-1: how likely other viewers pile onto this one. Drives the "worst comment" card. */
  risk: number;
  suggestedReply: string;
  /** Figures the numeric guard blanked out of the reply, if any. */
  redactedNumbers?: string[];
}

export interface SimulationResponse {
  comments: SimulatedComment[];
  /** Share of each reaction across the generated comments, in percent. */
  mix: Record<ReactionKind, number>;
  topRisk: SimulatedComment | null;
  backend: "llm" | "template";
  warning?: string;
}

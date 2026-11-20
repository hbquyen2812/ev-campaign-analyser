import { BarrierResponse, GreenwashResponse, Lang, Prediction, PredictionModel, ReportJobResponse, ReportResponse, CoachResponse, CoachTurn, SentimentResponse, SimulationResponse, Source } from "./types";
import { ApiError, getJson, postAppJson, postJson } from "./http";

const REPORT_POLL_INTERVAL_MS = 1_000;
const REPORT_POLL_TIMEOUT_MS = 10 * 60 * 1_000;

// Fast: prediction only (score, factors, suggestions). Returns almost instantly.
export function predict(text: string, source: Source, audience: number | null, model: PredictionModel = "legacy") {
  return postJson<Prediction>("/predict", { text, source, audience, model });
}

// Slow: enqueue the Qwen report, then poll with short requests so proxies do not
// have to keep one long HTTP connection alive. Older servers fall back to /report.
export async function getReport(
  text: string,
  source: Source,
  audience: number | null,
  lang: Lang,
  model: PredictionModel = "legacy",
  onProgress?: (job: ReportJobResponse) => void,
): Promise<ReportResponse> {
  const body = { text, source, audience, lang, model };
  let job: ReportJobResponse;
  try {
    job = await postJson<ReportJobResponse>("/report/jobs", body);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return postJson<ReportResponse>("/report", body);
    }
    throw error;
  }

  const deadline = Date.now() + REPORT_POLL_TIMEOUT_MS;
  let consecutiveNetworkErrors = 0;
  while (Date.now() < deadline) {
    onProgress?.(job);
    if (job.status === "succeeded") {
      if (!job.result) throw new Error("Report job succeeded without a result");
      return job.result;
    }
    if (job.status === "failed") {
      throw new Error(job.error || "Report generation failed");
    }

    await new Promise((resolve) => setTimeout(resolve, REPORT_POLL_INTERVAL_MS));
    try {
      job = await getJson<ReportJobResponse>(`/report/jobs/${encodeURIComponent(job.job_id)}`);
      consecutiveNetworkErrors = 0;
    } catch (error) {
      if (error instanceof ApiError || ++consecutiveNetworkErrors >= 3) throw error;
    }
  }
  throw new Error("Report queue timed out after 10 minutes");
}

// Batch: predict many posts at once (used by the Variant lab).
export function predictBatch(items: { text: string; source: Source; audience: number | null; model?: PredictionModel }[]) {
  return postJson<Prediction[]>("/predict/batch", { items });
}

// EV adoption barrier radar (via Qwen). Depends on the post text only.
export function getBarriers(text: string) {
  return postJson<BarrierResponse>("/barriers", { text });
}

// Greenwashing risk (via Qwen). The explanatory note is written in `lang`.
export function getGreenwashing(text: string, lang: Lang) {
  return postJson<GreenwashResponse>("/greenwashing", { text, lang });
}

// Likely audience reaction (via Qwen). The explanatory note is written in `lang`.
export function getSentiment(text: string, lang: Lang) {
  return postJson<SentimentResponse>("/sentiment", { text, lang });
}

// Predicted audience reaction (mục ② ③ ④). Served by our own Next.js route, which
// plays each persona against the post, so it does not go through the /api/ai proxy.
export function simulateAudience(post: string, lang: Lang) {
  return postAppJson<SimulationResponse>("/api/simulate", { post, lang });
}

// One turn of the practice chat (mục 2.3). Also our own route: the persona and the
// trust rubric live in this app, not in the Python service.
export function coachTurn(personaId: string, history: CoachTurn[], trust: number, lang: Lang) {
  return postAppJson<CoachResponse>("/api/coach", { personaId, history, trust, lang });
}

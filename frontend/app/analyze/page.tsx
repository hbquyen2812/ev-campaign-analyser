"use client";

import { useEffect, useRef, useState } from "react";
import { predict, predictBatch, getReport, getBarriers, getGreenwashing, getSentiment, simulateAudience } from "@/lib/api";
import { Prediction, ReportJobStatus, Source, Lang, BarrierResponse, GreenwashResponse, SentimentResponse, SimulationResponse, PredictionModel } from "@/lib/types";
import { AudiencePanel } from "../AudiencePanel";
import { MODELS, DEFAULT_MODEL_ID, GENERATION_LANG, modelApiId, modelName } from "@/lib/config";
import { addHistory, consumeAnalysisDraft, updateHistory } from "@/lib/history";
import { useLang } from "../LangContext";
import { useT } from "@/lib/i18n";
import Composer from "./Composer";
import RoadTrip, { type StationState } from "./RoadTrip";
import VersionCompare, { NETS, type VersionRow } from "./VersionCompare";
import { SAMPLE_VIDEO, VideoCard, type ClipStyle } from "./Clip";
import { probeVideo, type VideoReport } from "@/lib/video-probe";
import { NET_NAMES, NetworkCompare, ScoreGauge, MetaGrid, SummaryBox, FactorBars, ReportPanel, BarrierRadar, GreenwashCard, SentimentCard } from "../components";

interface NetResult { source: Source; audience: number | null; prediction: Prediction; }
interface AnalysisRequest {
  historyId: string;
  title: string;
  text: string;
  model: string;
  apiModel: PredictionModel;
  audiences: Record<Source, number | null>;
  lang: Lang;
}
interface QueueToast { id: number; title: string; message: string; }
const NETWORKS: Source[] = ["youtube", "x", "reddit"];
type Net = "youtube" | "x" | "reddit";
const IDLE_STATIONS: Record<Net, StationState> = { youtube: { status: "waiting" }, x: { status: "waiting" }, reddit: { status: "waiting" } };

// The barrier, greenwashing and sentiment cards call /barriers, /greenwashing and
// /sentiment, which the Python service has never implemented — a known gap recorded
// in docs/RUNNING.md when this frontend was imported. Until someone writes them, the
// cards can only render three error boxes, so they stay off and the requests are not
// made. Flip this to true the moment the endpoints exist; nothing else has to change.
const SECONDARY_CARDS_ENABLED = false;

const EXAMPLE_KEYS = [
  { label: "ex.range", text: "ex.range.txt" },
  { label: "ex.charging", text: "ex.charging.txt" },
  { label: "ex.price", text: "ex.price.txt" },
];
const TEMPLATE_KEYS = [
  { role: "tmpl.proof.role", text: "tmpl.proof.text" },
  { role: "tmpl.objection.role", text: "tmpl.objection.text" },
  { role: "tmpl.social.role", text: "tmpl.social.text" },
  { role: "tmpl.hook.role", text: "tmpl.hook.text" },
  { role: "tmpl.cta.role", text: "tmpl.cta.text" },
];

export default function Analyze() {
  const { lang } = useLang();
  const { t } = useT();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [audYt, setAudYt] = useState("");
  const [audX, setAudX] = useState("");
  const [audRd, setAudRd] = useState("");
  const [stations, setStations] = useState<Record<Net, StationState>>(IDLE_STATIONS);
  // Compare mode (formerly the Variant lab page): several versions, scored on all three networks.
  const [mode, setMode] = useState<"single" | "compare">("single");
  // Optional video attached to the post: measured in the browser as soon as it is attached.
  const [clipSrc, setClipSrc] = useState<string | null>(null);
  const [clipName, setClipName] = useState("");
  const [clipStyle, setClipStyle] = useState<ClipStyle>("post");
  const [clipReport, setClipReport] = useState<VideoReport | null>(null);
  const [clipBusy, setClipBusy] = useState(false);
  const [clipProgress, setClipProgress] = useState(0);
  const [clipError, setClipError] = useState<string | null>(null);
  const [clipInResults, setClipInResults] = useState(false);
  const clipUrl = useRef<string | null>(null);
  const clipRun = useRef(0);
  const [versions, setVersions] = useState<string[]>(["", ""]);
  const [activeV, setActiveV] = useState(0);
  const [vRows, setVRows] = useState<VersionRow[]>([]);
  const [vLoading, setVLoading] = useState(false);
  const [vCount, setVCount] = useState(0);
  const [vError, setVError] = useState<string | null>(null);
  const [reportJob, setReportJob] = useState<{ status: ReportJobStatus | null; position: number | null }>({ status: null, position: null });

  const [analyzedText, setAnalyzedText] = useState<string | null>(null);
  const [analyzedModel, setAnalyzedModel] = useState(DEFAULT_MODEL_ID);
  const [results, setResults] = useState<NetResult[]>([]);
  const [selected, setSelected] = useState<Source>("youtube");
  const [report, setReport] = useState<string | null>(null);
  const [reportLang, setReportLang] = useState<Lang | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAiPipeline, setLoadingAiPipeline] = useState(false);
  const [queuedAnalyses, setQueuedAnalyses] = useState(0);
  const [queueToasts, setQueueToasts] = useState<QueueToast[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [barriers, setBarriers] = useState<BarrierResponse | null>(null);
  const [loadingBarriers, setLoadingBarriers] = useState(false);
  const [barriersError, setBarriersError] = useState<string | null>(null);
  const [greenwash, setGreenwash] = useState<GreenwashResponse | null>(null);
  const [loadingGreenwash, setLoadingGreenwash] = useState(false);
  const [greenwashError, setGreenwashError] = useState<string | null>(null);
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [sentimentError, setSentimentError] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [loadingSimulation, setLoadingSimulation] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const histId = useRef<string | null>(null);
  const aiPipelineBusyRef = useRef(false);
  const pendingAnalysesRef = useRef<AnalysisRequest[]>([]);
  const toastIdRef = useRef(0);
  const toastTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const draft = consumeAnalysisDraft();
    if (!draft) return;
    setTitle(draft.title ?? "");
    setText(draft.text);
    if (draft.model) setModel(draft.model);
    if (draft.audiences) {
      setAudYt(draft.audiences.youtube == null ? "" : String(draft.audiences.youtube));
      setAudX(draft.audiences.x == null ? "" : String(draft.audiences.x));
      setAudRd(draft.audiences.reddit == null ? "" : String(draft.audiences.reddit));
    }
  }, []);

  useEffect(() => () => toastTimersRef.current.forEach(clearTimeout), []);

  // /variant-lab now lands here with ?mode=compare.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    if (m === "compare") setMode(m);
  }, []);

  const parseAud = (raw: string) => (raw.trim() ? Number(raw.replace(/[^0-9.]/g, "")) : null);
  const audMap = (): Record<Source, number | null> => ({ youtube: parseAud(audYt), x: parseAud(audX), reddit: parseAud(audRd), "": null });

  function showQueueToast(titleText: string, message: string) {
    const id = ++toastIdRef.current;
    setQueueToasts((items) => [...items, { id, title: titleText, message }]);
    toastTimersRef.current.push(setTimeout(() => {
      setQueueToasts((items) => items.filter((item) => item.id !== id));
    }, 5_000));
    return id;
  }

  function updateQueueToast(id: number, titleText: string, message: string) {
    setQueueToasts((items) => items.map((item) => (
      item.id === id ? { ...item, title: titleText, message } : item
    )));
  }

  async function fetchReport(txt: string, s: Source, audience: number | null, l: Lang, apiModel: PredictionModel) {
    setLoadingReport(true);
    setReportProgress(t("rep.submitting"));
    setReportError(null);
    setReportJob({ status: null, position: null });
    const toastId = showQueueToast(t("queue.report.title"), t("queue.report.submitting"));
    try {
      const res = await getReport(txt, s, audience, l, apiModel, (job) => {
        setReportJob({ status: job.status, position: job.position });
        setReportProgress(job.status === "queued" ? t("rep.queued", job.position ?? 1) : t("rep.running"));
        updateQueueToast(
          toastId,
          t("queue.report.title"),
          job.status === "queued"
            ? t("queue.report.message", job.position ?? 1)
            : t("queue.report.running"),
        );
      });
      setReport(res.report);
      setReportLang(l);
      if (histId.current) updateHistory(histId.current, { report: res.report });
    } catch (e) {
      setReport(null);
      setReportError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoadingReport(false);
      setReportProgress(null);
    }
  }

  async function fetchBarriers(txt: string) {
    setLoadingBarriers(true);
    setBarriersError(null);
    try {
      const b = await getBarriers(txt);
      setBarriers(b);
      if (histId.current) updateHistory(histId.current, { barriers: b });
    } catch (e) {
      setBarriers(null);
      setBarriersError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoadingBarriers(false);
    }
  }

  async function fetchGreenwash(txt: string, reportLanguage: Lang) {
    setLoadingGreenwash(true);
    setGreenwashError(null);
    try {
      const g = await getGreenwashing(txt, reportLanguage);
      setGreenwash(g);
      if (histId.current) updateHistory(histId.current, { greenwash: g });
    } catch (e) {
      setGreenwash(null);
      setGreenwashError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoadingGreenwash(false);
    }
  }

  async function fetchSentiment(txt: string, reportLanguage: Lang) {
    setLoadingSentiment(true);
    setSentimentError(null);
    try {
      const s = await getSentiment(txt, reportLanguage);
      setSentiment(s);
      if (histId.current) updateHistory(histId.current, { sentiment: s });
    } catch (e) {
      setSentiment(null);
      setSentimentError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoadingSentiment(false);
    }
  }

  async function fetchSimulation(txt: string, reportLanguage: Lang) {
    setLoadingSimulation(true);
    setSimulationError(null);
    try {
      setSimulation(await simulateAudience(txt, reportLanguage));
    } catch (e) {
      setSimulation(null);
      setSimulationError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoadingSimulation(false);
    }
  }

  async function runAnalysis(request: AnalysisRequest) {
    aiPipelineBusyRef.current = true;
    setLoadingAiPipeline(true);
    histId.current = request.historyId;
    updateHistory(request.historyId, { status: "running", error: undefined });
    setAnalyzedText(request.text);
    setAnalyzedModel(request.model);
    setResults([]);
    setReport(null);
    setError(null);
    setReportError(null);
    setBarriers(null);
    setBarriersError(null);
    setGreenwash(null);
    setGreenwashError(null);
    setSentiment(null);
    setSentimentError(null);
    setSimulation(null);
    setSimulationError(null);
    setStations(IDLE_STATIONS);
    setLoading(true);
    // Kicked off first and never awaited: it talks to its own route rather than the
    // Python service, so the predicted comments still arrive when scoring is down —
    // which is exactly when a user most wants to know what the audience will say.
    void fetchSimulation(request.text, GENERATION_LANG);
    try {
      // Sequential calls: Tailscale Funnel (free tier) and the CPU can't handle
      // many requests at once — parallel calls return 502. One at a time.
      const preds: Prediction[] = [];
      // Each station lights up as its own request starts and lands, so the car on
      // screen is the real progress, not a timer.
      for (const s of NETWORKS) {
        const net = s as Net;
        setStations((st) => ({ ...st, [net]: { status: "charging" } }));
        try {
          const pr = await predict(request.text, s, request.audiences[s], request.apiModel);
          preds.push(pr);
          setStations((st) => ({ ...st, [net]: { status: "done", score: pr.viral_score } }));
        } catch (err) {
          setStations((st) => {
            const next = { ...st, [net]: { status: "down" as const } };
            for (const r of NETWORKS) if (next[r as Net].status === "waiting") next[r as Net] = { status: "skipped" };
            return next;
          });
          throw err;
        }
      }
      const res: NetResult[] = NETWORKS.map((s, i) => ({ source: s, audience: request.audiences[s], prediction: preds[i] }));
      setResults(res);
      const best = res.reduce((a, b) => (b.prediction.viral_score > a.prediction.viral_score ? b : a));
      setSelected(best.source);
      setLoading(false);
      updateHistory(request.historyId, {
        source: best.source,
        scores: {
          youtube: res.find((r) => r.source === "youtube")?.prediction.viral_score,
          x: res.find((r) => r.source === "x")?.prediction.viral_score,
          reddit: res.find((r) => r.source === "reddit")?.prediction.viral_score,
        },
        best: { source: best.source, score: best.prediction.viral_score, label: best.prediction.label },
        prediction: best.prediction,
      });
      // Run the LLM analyses one after another (avoids 502s through the Funnel
      // and CPU contention). Fast 3B cards first, then the slower 7B report.
      if (SECONDARY_CARDS_ENABLED) {
        await fetchBarriers(request.text);
        await fetchGreenwash(request.text, request.lang);
        await fetchSentiment(request.text, request.lang);
      }
      await fetchReport(request.text, best.source, best.audience, request.lang, request.apiModel);
      updateHistory(request.historyId, { status: "completed" });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("an.err");
      setError(message);
      updateHistory(request.historyId, { status: "failed", error: message });
      setLoading(false);
    } finally {
      const next = pendingAnalysesRef.current.shift();
      setQueuedAnalyses(pendingAnalysesRef.current.length);
      if (next) {
        void runAnalysis(next);
      } else {
        aiPipelineBusyRef.current = false;
        setLoadingAiPipeline(false);
      }
    }
  }

  function onAnalyze(override?: string) {
    const text = override ?? curText;
    const historyId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    const audiences = audMap();
    const willQueue = aiPipelineBusyRef.current;
    const request: AnalysisRequest = {
      historyId,
      title,
      text,
      model,
      apiModel: modelApiId(model),
      audiences,
      lang,
    };
    addHistory({
      id: historyId,
      ts: Date.now(),
      status: willQueue ? "pending" : "running",
      title: title.trim() || undefined,
      text,
      model,
      audiences: { youtube: audiences.youtube, x: audiences.x, reddit: audiences.reddit },
    });
    if (willQueue) {
      pendingAnalysesRef.current.push(request);
      setQueuedAnalyses(pendingAnalysesRef.current.length);
      showQueueToast(t("queue.analysis.title"), t("queue.analysis.message", pendingAnalysesRef.current.length));
      return;
    }
    void runAnalysis(request);
  }

  const curText = mode === "single" ? text : versions[activeV] ?? "";
  function setCurText(v: string) {
    if (mode === "single") setText(v);
    else setVersions((a) => a.map((x, i) => (i === activeV ? v : x)));
  }
  function addTemplate(txt: string) {
    setCurText(curText.trim() ? `${curText.trim()} ${txt}` : txt);
  }

  async function attachClip(url: string, label: string) {
    const run = ++clipRun.current;
    setClipSrc(url); setClipName(label); setClipReport(null); setClipError(null); setClipProgress(0); setClipBusy(true);
    try {
      const r = await probeVideo(url, (x) => { if (run === clipRun.current) setClipProgress(x); });
      if (run === clipRun.current) setClipReport(r);
    } catch {
      if (run === clipRun.current) setClipError(lang === "vi" ? "Không đọc được video này. Thử file .mp4 hoặc .webm khác." : "Couldn't read this video. Try another .mp4 or .webm file.");
    } finally {
      if (run === clipRun.current) setClipBusy(false);
    }
  }
  function attachFile(f: File) {
    if (!f.type.startsWith("video/")) { setClipError(lang === "vi" ? "File này không phải video." : "That file isn't a video."); return; }
    if (clipUrl.current) URL.revokeObjectURL(clipUrl.current);
    clipUrl.current = URL.createObjectURL(f);
    void attachClip(clipUrl.current, f.name);
  }
  function removeClip() {
    clipRun.current++;
    if (clipUrl.current) { URL.revokeObjectURL(clipUrl.current); clipUrl.current = null; }
    setClipSrc(null); setClipReport(null); setClipBusy(false); setClipError(null); setClipStyle("post"); setClipInResults(false);
  }

  function switchMode(m: "single" | "compare") {
    if (m === mode) return;
    if (m === "compare" && mode === "single") { setVersions((a) => [text, a[1] ?? "", ...a.slice(2)]); setActiveV(0); }
    if (m === "single" && mode === "compare") setText(versions[activeV] ?? text);
    if (m === "compare") setClipInResults(false);
    setMode(m);
  }

  // A ready-made campaign, so a first visit can try everything without writing anything.
  // Figures come from the illustrative spec sheet, so the number check passes.
  function fillSample() {
    const vi = lang === "vi";
    setTitle(vi ? "Xe máy điện mùa mưa, tháng 12" : "Electric scooter for the rainy season, December");
    setAudYt("120000"); setAudX("8000"); setAudRd("15000");
    const v1 = vi
      ? "Mùa mưa ngập vẫn đi làm bình thường. Xe máy điện chuẩn chống nước IP67, lội nước tối đa 30 cm, đi được 120 km mỗi lần sạc, mỗi lần sạc đầy chỉ tốn khoảng 4.500 đ tiền điện. Đặt lịch lái thử miễn phí cuối tuần này!"
      : "Rainy season, flooded streets, still on time for work. IP67 water resistance, wades up to 30 cm, 120 km per charge, and a full charge costs about 4,500 VND in electricity. Book a free test ride this weekend!";
    const v2 = vi
      ? "Sợ xe chết máy giữa đường ngập? Xe máy điện này đạt chuẩn IP67 và lội được nước sâu tới 30 cm. Ghé showroom chạy thử trên đường ngập mô phỏng."
      : "Worried about stalling in a flooded street? This scooter is IP67 rated and wades up to 30 cm. Come try it on our flooded test track.";
    const v3 = vi
      ? "Đổ xăng mỗi tuần mệt rồi? Mỗi lần sạc đầy xe máy điện chỉ khoảng 4.500 đ tiền điện. Lái thử cuối tuần này."
      : "Tired of filling up every week? A full charge costs about 4,500 VND in electricity. Test ride this weekend.";
    if (mode === "compare") { setVersions([v1, v2, v3]); setActiveV(0); }
    else { setText(v1); if (!clipSrc) void attachClip(SAMPLE_VIDEO, vi ? "Video mẫu (10 giây)" : "Sample video (10 s)"); }
  }

  async function onCompare() {
    const filled = versions.map((v, i) => ({ text: v.trim(), index: i })).filter((v) => v.text);
    if (filled.length < 2) { setVError(lang === "vi" ? "Viết ít nhất hai bản có nội dung để so sánh." : "Write at least two versions to compare."); setVRows([]); return; }
    const aud = audMap();
    const apiModel = modelApiId(model);
    const items = filled.flatMap((v) => NETS.map((n) => ({ text: v.text, source: n.key as Source, audience: aud[n.key], model: apiModel })));
    setVError(null); setVRows([]); setVCount(filled.length); setVLoading(true);
    try {
      const preds = await predictBatch(items);
      setVRows(filled.map((v, i) => ({
        index: v.index, text: v.text,
        scores: { youtube: preds[i * 3], x: preds[i * 3 + 1], reddit: preds[i * 3 + 2] },
      })));
    } catch (e) {
      setVError(e instanceof Error ? e.message : t("an.err"));
    } finally {
      setVLoading(false);
    }
  }

  function lookCloser(v: string) {
    setText(v);
    setMode("single");
    window.scrollTo({ top: 0, behavior: "smooth" });
    onAnalyze(v);
  }

  function selectNetwork(s: Source) {
    if (aiPipelineBusyRef.current) return;
    setSelected(s);
    const r = results.find((x) => x.source === s);
    if (r && analyzedText) fetchReport(analyzedText, s, r.audience, lang, r.prediction.model ?? modelApiId(analyzedModel));
  }

  const sel = results.find((r) => r.source === selected);

  return (
    <>
      <div className="queue-toast-stack" aria-live="polite">
        {queueToasts.map((toast) => (
          <div className="queue-toast" key={toast.id} role="status">
            <div className="queue-toast-icon" aria-hidden="true">↻</div>
            <div><strong>{toast.title}</strong><span>{toast.message}</span></div>
          </div>
        ))}
      </div>
      <header className="an-head">
        <div>
          <h1 className="page-title">{t("an.title")}</h1>
          <p className="an-cue">
            {lang === "vi"
              ? "Viết bài, đặt số người theo dõi ở từng trạm rồi cho xe chạy. Xe sẽ ghé YouTube, X và Reddit và cho bạn biết bài đi xa tới đâu."
              : "Write the post, set your audience at each stop, then let the car go. It stops at YouTube, X and Reddit and tells you how far the post will travel."}
          </p>
        </div>
        {(
          <button type="button" className="sample-btn" onClick={fillSample}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 4h10l4 4v12H5zM15 4v4h4M9 13h6M9 17h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>
            {lang === "vi" ? "Dùng chiến dịch mẫu" : "Use a sample campaign"}
          </button>
        )}
      </header>

      <div className="mode-switch" role="tablist" aria-label={lang === "vi" ? "Chế độ" : "Mode"}>
        <button role="tab" aria-selected={mode === "single"} className={mode === "single" ? "on" : ""} onClick={() => switchMode("single")}>
          {lang === "vi" ? "Một bài" : "One post"}
        </button>
        <button role="tab" aria-selected={mode === "compare"} className={mode === "compare" ? "on" : ""} onClick={() => switchMode("compare")}>
          {lang === "vi" ? "So sánh phiên bản" : "Compare versions"}
        </button>
      </div>

      {<Composer
        title={title}
        setTitle={setTitle}
        text={curText}
        setText={setCurText}
        versions={mode === "compare" ? {
          count: versions.length, active: activeV, setActive: setActiveV,
          add: () => { if (versions.length < 5) { setVersions((a) => [...a, ""]); setActiveV(versions.length); } },
          remove: (i) => { setVersions((a) => a.filter((_, j) => j !== i)); setActiveV((a) => Math.max(0, a >= i ? a - 1 : a)); },
          filled: versions.map((v) => !!v.trim()),
        } : undefined}
        clip={mode === "single" ? {
          src: clipSrc, style: clipStyle, setStyle: setClipStyle,
          busy: clipBusy, progress: clipProgress, report: clipReport,
          attach: attachFile,
          sample: () => void attachClip(SAMPLE_VIDEO, lang === "vi" ? "Video mẫu (10 giây)" : "Sample video (10 s)"),
          remove: removeClip,
        } : undefined}
        addTemplate={addTemplate}
        audiences={{ youtube: audYt, x: audX, reddit: audRd }}
        setAudience={(src, v) => (src === "youtube" ? setAudYt : src === "x" ? setAudX : setAudRd)(v)}
        model={model}
        setModel={setModel}
        examples={EXAMPLE_KEYS}
        templates={TEMPLATE_KEYS}
        onLaunch={() => { if (mode === "compare") void onCompare(); else { setClipInResults(!!clipSrc); onAnalyze(); } }}
        launchDisabled={mode === "compare" ? vLoading || versions.filter((v) => v.trim()).length < 2 : loading || !curText.trim()}
        launchLabel={mode === "compare"
          ? (vLoading ? (lang === "vi" ? "Đang so sánh…" : "Comparing…") : (lang === "vi" ? "So sánh các phiên bản" : "Compare the versions"))
          : loading ? t("an.analyzing") : loadingAiPipeline ? t("an.queue.add") : t("an.stage.go")}
        status={loadingAiPipeline && (
          <div className="analysis-queue-status" role="status">
            <span className="spinner" />
            {queuedAnalyses > 0 ? t("an.queue.pending", queuedAnalyses) : t("an.queue.running")}
          </div>
        )}
      />}

      {mode === "single" && clipError && !clipInResults && <div className="error" style={{ marginTop: "1rem" }}>{clipError}</div>}

      {mode === "compare" && (vLoading || vRows.length > 0 || vError) && (
        <VersionCompare rows={vRows} loading={vLoading} count={vCount} error={vError} onLookCloser={lookCloser} />
      )}

      {mode === "single" && error && <div className="error" style={{ marginTop: "1.25rem" }}>{error}</div>}

      {mode === "single" && analyzedText && (
        <RoadTrip
          stations={stations}
          best={results.length ? results.reduce((a, b) => (b.prediction.viral_score > a.prediction.viral_score ? b : a)).source : null}
          selected={selected}
          onSelect={selectNetwork}
          canSelect={!loadingAiPipeline}
          postText={analyzedText}
          tags={t("an.preview.tags", modelName(analyzedModel), lang.toUpperCase())}
          simulation={simulation}
          simLoading={loadingSimulation}
          report={{ loading: loadingReport, status: reportJob.status, position: reportJob.position }}
        />
      )}

      {mode === "single" && analyzedText && clipInResults && clipSrc && (
        <div className="reveal" style={{ marginTop: "1.25rem" }}>
          <VideoCard report={clipReport} busy={clipBusy} progress={clipProgress} error={clipError} name={clipName} />
        </div>
      )}

            {/* Outside the results block on purpose: the predicted comments do not depend
          on the viral score, so they must still show when scoring fails. */}
      {mode === "single" && analyzedText && (loadingSimulation || simulation || simulationError) && (
        <div className="reveal" style={{ marginTop: "1.25rem" }}>
          <AudiencePanel data={simulation} loading={loadingSimulation} error={simulationError} />
        </div>
      )}

      {mode === "single" && results.length > 0 && (
        <div className="reveal-group">
          <NetworkCompare results={results} selected={selected} onSelect={selectNetwork} />
          {sel && (
            <>
              <div className="eyebrow">{t("an.details", NET_NAMES[selected])}</div>
              <div className="metrics">
                <ScoreGauge prediction={sel.prediction} />
                <MetaGrid prediction={sel.prediction} source={selected} />
              </div>
              <SummaryBox factors={sel.prediction.top_factors} />
              {SECONDARY_CARDS_ENABLED && (
                <>
                  <div className="cols">
                    <BarrierRadar data={barriers} loading={loadingBarriers} error={barriersError} />
                    <GreenwashCard data={greenwash} loading={loadingGreenwash} error={greenwashError} />
                  </div>
                  <div style={{ marginBottom: "1.25rem" }}>
                    <SentimentCard data={sentiment} loading={loadingSentiment} error={sentimentError} />
                  </div>
                </>
              )}
              <div className="stack">
                <FactorBars factors={sel.prediction.top_factors} />
                <ReportPanel
                  report={report}
                  loading={loadingReport}
                  loadingLabel={reportProgress}
                  error={reportError}
                  onTranslate={reportLang && reportLang !== lang && sel && analyzedText ? () => fetchReport(analyzedText, selected, sel.audience, lang, sel.prediction.model ?? modelApiId(analyzedModel)) : undefined}
                  translateLabel={t("rep.translate")}
                />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

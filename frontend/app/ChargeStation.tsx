"use client";

import { useEffect, useRef, useState } from "react";
import { predictBatch } from "@/lib/api";
import { DECISION_THRESHOLD } from "@/lib/config";
import { factorLabel, useT } from "@/lib/i18n";
import { Factor, Source } from "@/lib/types";

type Status = "idle" | "charging" | "done" | "error";

interface Port {
  source: Source;
  name: string;
  audience: number;
  score: number;
  factors: Factor[] | null;
}

// Starting values are a real run of the current "legacy" model on SAMPLE_POST
// with these audiences (2026-11-24). Factors appear after the visitor's first run.
const SAMPLE_POST =
  "New electric SUV — 510 km range on a single charge, independently tested. Charge 10 to 80 percent in 18 minutes at 3,200 fast-charging stations nationwide. Book your free test drive today.";
const START: Port[] = [
  { source: "youtube", name: "YouTube", audience: 800_000, score: 0.854, factors: null },
  { source: "x", name: "X", audience: 40_000, score: 0.44, factors: null },
  { source: "reddit", name: "Reddit", audience: 350_000, score: 0.316, factors: null },
];
const CELLS = 10;
const MIN_EXP = 2; // 100 followers
const MAX_EXP = 7; // 10M followers

function compact(n: number, lang: string) {
  return new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function roundAudience(exp: number) {
  const raw = Math.pow(10, exp);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
  return Math.round(raw / mag) * mag;
}

// Counts the displayed number toward the target so a new result reads as "charging up".
function useCountUp(target: number, run: number) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || run === 0) { setShown(target); from.current = target; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min((now - start) / 900, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(a + (target - a) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return shown;
}

function PortScreen({ score, charging, run }: { score: number; charging: boolean; run: number }) {
  const shown = useCountUp(score, run);
  const low = score < DECISION_THRESHOLD;
  const lit = Math.round(shown * CELLS);
  return (
    <div className={`screen${charging ? " is-charging" : ""}`}>
      <div className={`screen-pct${low ? " low" : ""}`}>{charging ? "··" : Math.round(shown * 100)}<span>%</span></div>
      <span className={`charge${low ? " low" : ""}`} aria-hidden="true">
        {Array.from({ length: CELLS }, (_, i) => (
          <i key={i} className={charging ? "sweep" : i < lit ? "on" : ""} style={charging ? { animationDelay: `${i * 80}ms` } : undefined} />
        ))}
        <b className="charge-mark" style={{ left: `${DECISION_THRESHOLD * 100}%` }} />
      </span>
    </div>
  );
}

// Cartoon scene: the car drives to the charger, plugs in while the model runs,
// then hops when the result lands. Pure SVG + CSS, driven by the status class.
function Scene({ status, low }: { status: Status; low: boolean }) {
  return (
    <svg className={`scene ${status}${low ? " low" : ""}`} viewBox="0 0 520 150" role="img" aria-hidden="true">
      <rect x="0" y="0" width="520" height="150" className="sky" />
      <g className="clouds">
        <path d="M60 34a12 12 0 0 1 22-6 10 10 0 0 1 16 8H54a8 8 0 0 1 6-2Z" />
        <path d="M300 22a10 10 0 0 1 18-5 8 8 0 0 1 13 7h-36a6 6 0 0 1 5-2Z" />
      </g>
      <rect x="0" y="122" width="520" height="28" className="road" />
      <line x1="0" y1="136" x2="520" y2="136" className="lane" />

      {/* charger post */}
      <g className="post">
        <rect x="444" y="40" width="44" height="84" rx="8" className="post-body" />
        <rect x="452" y="50" width="28" height="20" rx="3" className="post-screen" />
        <path d="M468 54l-6 8h5l-2 6 7-9h-5l2-5Z" className="post-bolt" />
        <circle cx="466" cy="90" r="6" className="post-socket" />
        <rect x="438" y="120" width="56" height="6" rx="3" className="post-base" />
      </g>

      {/* cable: only drawn once the car is docked */}
      <path d="M418 80 C 430 112, 450 110, 462 92" className="cable" />
      <path d="M418 80 C 430 112, 450 110, 462 92" className="cable-flow" />

      <g className="car">
        <g className="car-body">
          <g className="speed">
            <line x1="-26" y1="70" x2="-8" y2="70" />
            <line x1="-34" y1="84" x2="-10" y2="84" />
            <line x1="-22" y1="98" x2="-6" y2="98" />
          </g>
          <path d="M8 104 C 4 84, 14 72, 34 70 L 56 50 C 62 44, 70 42, 80 42 L 112 42 C 124 42, 132 48, 138 58 L 148 72 C 160 74, 166 82, 166 94 L 166 104 Z" className="shell" />
          <path d="M62 54 C 66 50, 70 48, 78 48 L 110 48 C 118 48, 124 52, 128 58 L 136 70 L 52 70 Z" className="glass" />
          <g className="eyes">
            <ellipse cx="96" cy="60" rx="7" ry="8" className="eye" />
            <ellipse cx="116" cy="60" rx="7" ry="8" className="eye" />
            <circle cx="98" cy="61" r="3.4" className="pupil" />
            <circle cx="118" cy="61" r="3.4" className="pupil" />
          </g>
          <path d="M100 74 q 8 6 16 0" className="smile" />
          <rect x="150" y="84" width="10" height="6" rx="2" className="headlight" />
          <circle cx="158" cy="80" r="3" className="port-dot" />
          {/* roof battery */}
          <g className="battery">
            <rect x="74" y="24" width="40" height="14" rx="3" className="bat-shell" />
            <rect x="114" y="28" width="4" height="6" rx="1" className="bat-shell" />
            <rect x="77" y="27" width="34" height="8" rx="1.5" className="bat-fill" />
          </g>
        </g>
        <g className="wheel">
          <circle cx="44" cy="106" r="15" className="tyre" />
          <circle cx="44" cy="106" r="6" className="hub" />
          <path d="M44 93v26M31 106h26" className="spoke" />
        </g>
        <g className="wheel">
          <circle cx="132" cy="106" r="15" className="tyre" />
          <circle cx="132" cy="106" r="6" className="hub" />
          <path d="M132 93v26M119 106h26" className="spoke" />
        </g>
        <g className="sparks">
          <path d="M84 14l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
          <path d="M140 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
          <path d="M40 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
        </g>
      </g>
    </svg>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ChargeStation() {
  const { t, lang } = useT();
  const [text, setText] = useState(SAMPLE_POST);
  const [ports, setPorts] = useState<Port[]>(START);
  const [status, setStatus] = useState<Status>("idle");
  const [selected, setSelected] = useState<Source>("youtube");
  const [run, setRun] = useState(0);

  const best = ports.reduce((a, b) => (b.score > a.score ? b : a), ports[0]);
  const charging = status === "charging";
  const sel = ports.find((p) => p.source === selected) ?? ports[0];

  async function plugIn() {
    if (!text.trim() || charging) return;
    setStatus("charging");
    try {
      // Keep the drive-and-plug animation on screen even when the model answers instantly.
      const [res] = await Promise.all([
        predictBatch(ports.map((p) => ({ text: text.trim(), source: p.source, audience: p.audience, model: "legacy" }))),
        wait(1900),
      ]);
      setPorts((prev) => prev.map((p, i) => ({
        ...p,
        score: res[i].viral_score,
        factors: res[i].top_factors.filter((f) => !f.feature.startsWith("src_")).slice(0, 4),
      })));
      setRun((r) => r + 1);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function setAudience(source: Source, exp: number) {
    setPorts((prev) => prev.map((p) => (p.source === source ? { ...p, audience: roundAudience(exp) } : p)));
  }

  const maxContribution = sel.factors?.length ? Math.max(...sel.factors.map((f) => Math.abs(f.contribution))) : 1;

  return (
    <section className={`station${charging ? " is-charging" : ""}`} aria-label={t("home.station.title")}>
      <div className="station-fascia">
        <span className="station-bolt" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" /></svg>
        </span>
        <span>{t("home.station.title")}</span>
        <span className={`station-led ${status}`} aria-hidden="true" />
      </div>

      <Scene status={status} low={best.score < DECISION_THRESHOLD} />

      <label className="station-input">
        <span className="sr-only">{t("home.station.postlabel")}</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={600} placeholder={t("home.station.placeholder")} />
      </label>

      <div className="ports">
        {ports.map((p, i) => {
          const active = p.source === selected;
          const exp = Math.log10(p.audience);
          return (
            <div key={p.source} className={`port${active ? " active" : ""}${p.source === best.source && !charging ? " best" : ""}`}>
              <button type="button" className="port-pick" aria-pressed={active} onClick={() => setSelected(p.source)}>
                <span className="port-tag"><b>{i + 1}</b>{p.name}{p.source === best.source && !charging && <em>{t("cmp.best")}</em>}</span>
                <PortScreen score={p.score} charging={charging} run={run} />
              </button>
              <label className="port-aud">
                <span>{compact(p.audience, lang)} {t("home.station.followers")}</span>
                <input
                  type="range" min={MIN_EXP} max={MAX_EXP} step={0.05} value={exp}
                  onChange={(e) => setAudience(p.source, Number(e.target.value))}
                  aria-label={`${p.name}: ${t("home.station.followers")}`}
                  aria-valuetext={compact(p.audience, lang)}
                />
              </label>
              <span className={`port-socket ${charging ? "charging" : status === "done" ? (p.score < DECISION_THRESHOLD ? "low" : "ok") : ""}`} aria-hidden="true"><i /><i /><i /></span>
            </div>
          );
        })}
      </div>

      <div className="station-actions">
        <button type="button" className="plug-btn" onClick={plugIn} disabled={charging || !text.trim()}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {charging ? t("home.station.charging") : status === "done" ? t("home.station.again") : t("home.station.plug")}
        </button>
        <span className="station-status" role="status">
          {status === "error" ? t("home.station.error") : status === "done" ? t("home.station.live") : status === "idle" ? t("home.station.hint") : ""}
        </span>
      </div>

      {sel.factors && status !== "charging" && (
        <div className="station-why">
          <div className="why-head">{t("home.station.why", sel.name)}</div>
          {sel.factors.length === 0 ? (
            <div className="why-empty">{t("home.station.nofactors")}</div>
          ) : (
            <ul className="why-list">
              {sel.factors.map((f) => {
                const up = f.contribution > 0;
                const w = `${(Math.abs(f.contribution) / maxContribution) * 100}%`;
                return (
                  <li key={f.feature} className={up ? "up" : "down"}>
                    <span className="why-name">{factorLabel(lang, f.feature, f.label)}</span>
                    <span className="why-track" aria-hidden="true">
                      <span className="why-neg">{!up && <i style={{ width: w }} />}</span>
                      <span className="why-pos">{up && <i style={{ width: w }} />}</span>
                    </span>
                    <span className="why-val">{up ? "+" : "−"}{Math.abs(f.contribution).toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

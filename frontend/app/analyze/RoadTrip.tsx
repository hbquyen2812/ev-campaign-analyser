"use client";

// Acts 2 and 3 of the analyse page. The post, now a little EV, drives to each
// network's charger in turn. It moves only when the real request for that network
// starts, and a station lights up only when its real score lands — the predictions
// are made one at a time, so the trip is the progress bar. Predicted commenters
// stand along the road, and the report queue is a charging lane.

import { useEffect, useMemo, useRef, useState } from "react";
import { DECISION_THRESHOLD } from "@/lib/config";
import { useT } from "@/lib/i18n";
import type { ReactionKind, ReportJobStatus, SimulationResponse, Source } from "@/lib/types";
import { Person, lookFor } from "../coach/Showroom";

export type StationStatus = "waiting" | "charging" | "done" | "down" | "skipped";
export interface StationState { status: StationStatus; score?: number }
type Net = "youtube" | "x" | "reddit";

const STOPS: { source: Net; name: string; x: number }[] = [
  { source: "youtube", name: "YouTube", x: 290 },
  { source: "x", name: "X", x: 560 },
  { source: "reddit", name: "Reddit", x: 830 },
];
const START_X = 80;
const PARK_OFFSET = 92; // the car parks to the left of the charger
const SLOTS = [150, 420, 690, 950]; // where commenters stand
const CELLS = 10;

interface Props {
  stations: Record<Net, StationState>;
  best: Source | null;
  selected: Source;
  onSelect: (s: Source) => void;
  canSelect: boolean;
  postText: string;
  tags: string;
  simulation: SimulationResponse | null;
  simLoading: boolean;
  report: { loading: boolean; status: ReportJobStatus | null; position: number | null };
}

function useCountUp(target: number | undefined) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (target == null) { setShown(0); return; }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(target); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min((now - start) / 900, 1);
      setShown(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}

function StationScreen({ st }: { st: StationState }) {
  const { t } = useT();
  const shown = useCountUp(st.status === "done" ? st.score : undefined);
  const low = (st.score ?? 0) < DECISION_THRESHOLD;
  const lit = Math.round(shown * CELLS);
  if (st.status === "down") return <div className="trip-screen down"><span>{t("an.trip.down")}</span></div>;
  return (
    <div className={`trip-screen ${st.status}`}>
      <div className={`trip-pct${low ? " low" : ""}`}>
        {st.status === "done" ? Math.round(shown * 100) : st.status === "charging" ? "··" : "–"}
        <small>%</small>
      </div>
      <span className={`charge${low ? " low" : ""}`} aria-hidden="true">
        {Array.from({ length: CELLS }, (_, i) => (
          <i key={i} className={st.status === "charging" ? "sweep" : i < lit ? "on" : ""} style={st.status === "charging" ? { animationDelay: `${i * 80}ms` } : undefined} />
        ))}
      </span>
    </div>
  );
}

export default function RoadTrip(p: Props) {
  const { t } = useT();

  // Where the car should be, derived from the real request states only.
  const target = useMemo(() => {
    const at = (s: Net) => (STOPS.find((x) => x.source === s)?.x ?? START_X) - PARK_OFFSET;
    const busy = STOPS.find((s) => p.stations[s.source].status === "charging" || p.stations[s.source].status === "down");
    if (busy) return at(busy.source);
    if (p.best) return at(p.best as Net);
    const lastDone = [...STOPS].reverse().find((s) => p.stations[s.source].status === "done");
    return lastDone ? at(lastDone.source) : START_X;
  }, [p.stations, p.best]);

  const [driving, setDriving] = useState(false);
  const prev = useRef(target);
  const [face, setFace] = useState<1 | -1>(1);
  useEffect(() => {
    if (prev.current !== target) {
      setFace(target < prev.current ? -1 : 1);
      setDriving(true);
      prev.current = target;
    }
  }, [target]);

  // On a phone the road is wider than the screen: keep the car in view.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({ left: (target / 1000) * el.scrollWidth - el.clientWidth / 2, behavior: "smooth" });
  }, [target]);

  const anyDown = STOPS.some((s) => p.stations[s.source].status === "down");
  const charging = STOPS.some((s) => p.stations[s.source].status === "charging");
  const finished = !!p.best && !charging;

  // Commenters: one per persona, each cycling through what that persona said.
  const crowd = useMemo(() => {
    const by = new Map<string, { id: string; name: string; lines: { text: string; reaction: ReactionKind }[] }>();
    for (const c of p.simulation?.comments ?? []) {
      const g = by.get(c.personaId) ?? { id: c.personaId, name: c.personaName, lines: [] };
      g.lines.push({ text: c.comment, reaction: c.reaction });
      by.set(c.personaId, g);
    }
    return [...by.values()].slice(0, SLOTS.length);
  }, [p.simulation]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!crowd.length) return;
    const id = setInterval(() => setTick((n) => n + 1), 4200);
    return () => clearInterval(id);
  }, [crowd.length]);

  return (
    <section className="trip card" aria-label={t("an.trip.label")}>
      <div className="trip-head">
        <span className="trip-post">“{p.postText.length > 110 ? `${p.postText.slice(0, 110)}…` : p.postText}”</span>
        <span className="trip-tags">{p.tags}</span>
      </div>

      <div className="trip-scroll" ref={scrollRef}>
      <div className="trip-stage">
        <svg className="trip-bg" viewBox="0 0 1000 330" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="trip-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a8d6ff" /><stop offset="1" stopColor="#eaf6ff" />
            </linearGradient>
          </defs>
          <rect width="1000" height="330" fill="url(#trip-sky)" />
          <g className="sr-cloud c1" fill="#fff"><ellipse cx="160" cy="50" rx="44" ry="14" /><circle cx="150" cy="42" r="18" /><circle cx="178" cy="40" r="14" /></g>
          <g className="sr-cloud c2" fill="#fff"><ellipse cx="640" cy="36" rx="36" ry="11" /><circle cx="632" cy="30" r="14" /><circle cx="654" cy="29" r="11" /></g>
          <path d="M0 200 Q120 140 250 185 T520 175 T780 170 T1000 180 V230 H0Z" fill="#bfe3c4" />
          <path d="M0 215 Q180 175 380 205 T760 200 T1000 205 V230 H0Z" fill="#9fd3a7" />
          <rect x="0" y="226" width="1000" height="8" fill="#d6dee8" />
          <rect x="0" y="234" width="1000" height="62" fill="#3a4a60" />
          <line x1="0" y1="265" x2="1000" y2="265" stroke="#ffc20e" strokeWidth="3" strokeDasharray="26 22" className={`trip-lane${driving ? " move" : ""}`} />
          <rect x="0" y="296" width="1000" height="34" fill="#7cc576" />
          {/* start line */}
          <g transform="translate(18 236)">
            {[0, 1, 2, 3, 4, 5].map((r) => [0, 1].map((c) => (
              <rect key={`${r}${c}`} x={c * 10} y={r * 10} width="10" height="10" fill={(r + c) % 2 ? "#fff" : "#0f1b2d"} />
            )))}
          </g>
        </svg>

        {/* commenters along the verge, bubbles above */}
        {crowd.map((g, i) => {
          const line = g.lines[(tick + i) % g.lines.length];
          return (
            <div key={g.id} className="trip-fan" style={{ left: `${(SLOTS[i] / 1000) * 100}%`, animationDelay: `${i * 180}ms` }}>
              <div key={`${tick}-${i}`} className={`trip-say ${line.reaction}`} style={{ animationDelay: `${i * 250}ms` }}>{line.text}</div>
              <Person look={lookFor(g.id, i)} mood={line.reaction === "positive" ? "happy" : line.reaction === "negative" ? "worried" : "neutral"} />
              <span className="trip-fan-name">{g.name}</span>
            </div>
          );
        })}
        {p.simLoading && !crowd.length && SLOTS.slice(0, 3).map((x, i) => (
          <div key={x} className="trip-fan ghost" style={{ left: `${(x / 1000) * 100}%` }}>
            <div className="trip-say dots"><span className="sr-dots"><i /><i /><i /></span></div>
            <Person look={lookFor(["tinh-toan", "lo-ngap", "sinh-vien"][i], i)} mood="neutral" />
          </div>
        ))}

        {/* charging stations */}
        {STOPS.map((s) => {
          const st = p.stations[s.source];
          const isBest = finished && p.best === s.source;
          const clickable = p.canSelect && st.status === "done";
          return (
            <button
              key={s.source}
              type="button"
              className={`trip-station ${st.status}${isBest ? " best" : ""}${p.selected === s.source && finished ? " sel" : ""}`}
              style={{ left: `${(s.x / 1000) * 100}%` }}
              onClick={() => clickable && p.onSelect(s.source)}
              disabled={!clickable}
              aria-label={`${s.name}: ${st.status === "done" ? `${Math.round((st.score ?? 0) * 100)}%` : t(`an.trip.st.${st.status}`)}`}
            >
              {isBest && <span className="trip-flag" aria-hidden="true"><svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M3 15V1.5M3 2h9l-2 3 2 3H3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg> {t("cmp.best")}</span>}
              <span className="trip-sign">{s.name}</span>
              <StationScreen st={st} />
              <span className="trip-pillar" aria-hidden="true"><i /></span>
              {st.status === "down" && <span className="trip-sparks" aria-hidden="true"><i /><i /><i /></span>}
            </button>
          );
        })}

        {/* the car */}
        <div
          className={`trip-car${driving ? " driving" : ""}${charging ? " plugged" : ""}${anyDown ? " stalled" : ""}${finished ? " parked" : ""}`}
          style={{ left: `${(target / 1000) * 100}%` }}
          onTransitionEnd={(e) => { if (e.propertyName === "left") setDriving(false); }}
        >
          <svg viewBox="0 0 170 124" className={face < 0 ? "flip" : undefined} aria-hidden="true">
            <g className="tc-body">
              <path d="M8 104 C 4 84, 14 72, 34 70 L 56 50 C 62 44, 70 42, 80 42 L 112 42 C 124 42, 132 48, 138 58 L 148 72 C 160 74, 166 82, 166 94 L 166 104 Z" fill="#fff" stroke="#0b4ea2" strokeWidth="4" />
              <path d="M62 54 C 66 50, 70 48, 78 48 L 110 48 C 118 48, 124 52, 128 58 L 136 70 L 52 70 Z" fill="#cfe6fb" />
              <ellipse cx="96" cy="60" rx="7" ry="8" fill="#fff" stroke="#0f1b2d" strokeWidth="1.5" />
              <ellipse cx="116" cy="60" rx="7" ry="8" fill="#fff" stroke="#0f1b2d" strokeWidth="1.5" />
              <circle cx="98" cy="61" r="3.4" fill="#0f1b2d" />
              <circle cx="118" cy="61" r="3.4" fill="#0f1b2d" />
              <path className="tc-mouth" d={anyDown ? "M100 78 q 8 -6 16 0" : "M100 74 q 8 6 16 0"} stroke="#0f1b2d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <rect x="150" y="84" width="10" height="6" rx="2" fill="#ffc20e" />
              <g>
                <rect x="74" y="24" width="40" height="14" rx="3" fill="#0a1626" />
                <rect x="114" y="28" width="4" height="6" rx="1" fill="#0a1626" />
                <rect className="tc-bat" x="77" y="27" width="34" height="8" rx="1.5" fill="#3be08a" />
              </g>
            </g>
            {[44, 132].map((cx) => (
              <g key={cx} className="tc-wheel" style={{ transformOrigin: `${cx}px 106px` }}>
                <circle cx={cx} cy="106" r="15" fill="#1b2a40" />
                <circle cx={cx} cy="106" r="6" fill="#cdd6e2" />
                <path d={`M${cx} 93v26M${cx - 13} 106h26`} stroke="#cdd6e2" strokeWidth="2.5" />
              </g>
            ))}
          </svg>
          {charging && <span className="tc-cable" aria-hidden="true" />}
          {anyDown && <span className="tc-smoke" aria-hidden="true"><i /><i /><i /></span>}
        </div>
      </div>
      </div>

      {/* Act 3: the report queue as a charging lane */}
      {p.report.loading && (
        <div className="lane" role="status">
          <span className="lane-label">
            {p.report.status === "queued"
              ? t("an.trip.lane.queued", p.report.position ?? 1)
              : p.report.status === "running" ? t("an.trip.lane.running") : t("an.trip.lane.submit")}
          </span>
          <span className="lane-track" aria-hidden="true">
            {Array.from({ length: Math.min(6, p.report.status === "queued" ? Math.max(0, (p.report.position ?? 1) - 1) : 0) }, (_, i) => (
              <i key={i} className="lane-car other" />
            ))}
            <i className={`lane-car mine${p.report.status === "running" ? " writing" : ""}`} />
            <b className="lane-pen">✎</b>
          </span>
        </div>
      )}
      {anyDown && <div className="trip-note">{t("an.trip.downnote")}</div>}
    </section>
  );
}

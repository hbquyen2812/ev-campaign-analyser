"use client";

// Results of compare mode (what used to be the separate Variant lab): every version of
// the post scored on all three networks in one batch, with the strongest per network
// marked. "Look closer" sends a version through the full single-post analysis.

import { DECISION_THRESHOLD } from "@/lib/config";
import { useT } from "@/lib/i18n";
import type { Prediction } from "@/lib/types";
import { ChargeCells } from "../components";

export type Net = "youtube" | "x" | "reddit";
export const NETS: { key: Net; name: string }[] = [
  { key: "youtube", name: "YouTube" },
  { key: "x", name: "X" },
  { key: "reddit", name: "Reddit" },
];
export interface VersionRow { index: number; text: string; scores: Record<Net, Prediction> }

export default function VersionCompare({ rows, loading, count, error, onLookCloser }: {
  rows: VersionRow[];
  loading: boolean;
  count: number;
  error: string | null;
  onLookCloser: (text: string) => void;
}) {
  const { lang } = useT();
  const vi = lang === "vi";

  const best: Record<Net, number> = { youtube: -1, x: -1, reddit: -1 };
  for (const n of NETS) {
    let top = -1, at = -1;
    rows.forEach((r) => { if (r.scores[n.key].viral_score > top) { top = r.scores[n.key].viral_score; at = r.index; } });
    best[n.key] = at;
  }
  const avg = (r: VersionRow) => NETS.reduce((s, n) => s + r.scores[n.key].viral_score, 0) / NETS.length;
  const topAvg = rows.length ? rows.reduce((a, b) => (avg(b) > avg(a) ? b : a)).index : -1;

  return (
    <section className="card vc" aria-live="polite">
      <div className="section-title">{vi ? "Phiên bản nào đi xa hơn?" : "Which version goes further?"}</div>
      {error && <div className="error">{error}</div>}

      {loading && (
        <div className="vc-grid">
          {Array.from({ length: count }, (_, i) => (
            <div className="vc-row loading" key={i}>
              <div className="vc-name">{vi ? `Bản ${i + 1}` : `Version ${i + 1}`}</div>
              {NETS.map((n) => (
                <div className="vc-cell" key={n.key}>
                  <span className="vc-net">{n.name}</span>
                  <span className="vc-pct">··</span>
                  <span className="charge" aria-hidden="true">{Array.from({ length: 10 }, (_, k) => <i key={k} className="sweep" style={{ animationDelay: `${k * 80}ms` }} />)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="vc-grid">
            {rows.map((r, ri) => (
              <div className={`vc-row${r.index === topAvg ? " top" : ""}`} key={r.index} style={{ animationDelay: `${ri * 90}ms` }}>
                <div className="vc-name">
                  <strong>{vi ? `Bản ${r.index + 1}` : `Version ${r.index + 1}`}</strong>
                  {r.index === topAvg && <span className="vc-chip">{vi ? "Cao nhất trung bình" : "Highest on average"}</span>}
                  <p className="vc-text">{r.text}</p>
                  <button type="button" className="vc-look" onClick={() => onLookCloser(r.text)}>{vi ? "Phân tích kỹ bản này" : "Look closer at this one"}</button>
                </div>
                {NETS.map((n) => {
                  const p = r.scores[n.key];
                  const low = p.viral_score < DECISION_THRESHOLD;
                  return (
                    <div className={`vc-cell${best[n.key] === r.index ? " best" : ""}`} key={n.key}>
                      <span className="vc-net">{n.name}{best[n.key] === r.index && <em>{vi ? "Tốt nhất" : "Best"}</em>}</span>
                      <span className={`vc-pct${low ? " low" : ""}`}>{Math.round(p.viral_score * 100)}<small>%</small></span>
                      <ChargeCells value={p.viral_score} low={low} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="vc-note">
            {vi
              ? "Mỗi ô là điểm lan truyền của bản đó trên mạng đó, dùng số người theo dõi bạn đặt ở từng trạm. Vạch vàng là ngưỡng 25%."
              : "Each cell is that version's reach score on that network, using the audience you set at each stop. The yellow tick is the 25% threshold."}
          </p>
        </>
      )}
    </section>
  );
}

"use client";

import { useT } from "@/lib/i18n";
import type { ReactionKind, SimulationResponse } from "@/lib/types";
import { Icon } from "./components";

const ORDER: ReactionKind[] = ["positive", "skeptical", "negative"];

/**
 * What the audience will say: the reaction split, the comment to answer first, and
 * every predicted comment with a reply ready to paste.
 */
export function AudiencePanel({ data, loading, error }: {
  data: SimulationResponse | null;
  loading: boolean;
  error: string | null;
}) {
  const { t } = useT();

  return (
    <div className="card">
      <div className="section-title"><Icon name="chat" /> {t("sim.title")}</div>

      {loading && <div className="loading-row"><span className="spinner" />{t("sim.loading")}</div>}
      {error && !loading && <div className="warn">{t("sim.err", error)}</div>}

      {data && !loading && (
        <>
          {/* A sample run has to announce itself, or a demo quietly shows canned text. */}
          {data.backend === "template" && <div className="warn">{t("sim.sample")}</div>}
          {data.backend === "llm" && data.warning && <div className="warn">{data.warning}</div>}

          <div className="sim-mix-head">{t("sim.mix.title")}</div>
          <div className="sim-mix-bar" role="img" aria-label={ORDER.map((r) => `${t(`sim.mix.${r}`)} ${data.mix[r]}%`).join(", ")}>
            {ORDER.map((r) => (
              data.mix[r] > 0 && <span key={r} className={`sim-seg ${r}`} style={{ width: `${data.mix[r]}%` }} />
            ))}
          </div>
          <div className="sim-mix-legend">
            {ORDER.map((r) => (
              <span key={r} className="sim-legend-item">
                <span className={`sim-dot ${r}`} />{t(`sim.mix.${r}`)} <strong>{data.mix[r]}%</strong>
              </span>
            ))}
          </div>

          {data.topRisk && (
            <div className="sim-toprisk">
              <div className="sim-toprisk-head"><Icon name="shield" size={15} /> {t("sim.risk.title")}</div>
              <blockquote className="sim-quote">{data.topRisk.comment}</blockquote>
              <div className="sim-reply"><strong>{t("sim.reply")}</strong> {data.topRisk.suggestedReply}</div>
            </div>
          )}

          <div className="sim-list-head">{t("sim.list.title", data.comments.length)}</div>
          <div className="sim-list">
            {data.comments.map((c, i) => (
              <div className="sim-item" key={`${c.personaId}-${i}`}>
                <div className="sim-item-head">
                  <span className="sim-persona">{c.personaName}</span>
                  <span className={`reaction-badge ${c.reaction}`}>{t(`sim.mix.${c.reaction}`)}</span>
                </div>
                <div className="sim-comment">{c.comment}</div>
                <div className="sim-reply"><strong>{t("sim.reply")}</strong> {c.suggestedReply}</div>
                {/* The guard firing is worth showing, not hiding: it is the proof that
                    no invented figure reached the screen. */}
                {c.redactedNumbers && c.redactedNumbers.length > 0 && (
                  <div className="sim-redacted">
                    <Icon name="shield" size={13} /> {t("sim.redacted", c.redactedNumbers.join(", "))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

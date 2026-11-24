"use client";

import { useEffect, useRef, useState } from "react";
import { coachTurn } from "@/lib/api";
import { PERSONAS, SPEC_SHEET } from "@/lib/personas";
import { GENERATION_LANG } from "@/lib/config";
import type { CoachResponse, CoachTurn } from "@/lib/types";
import { useLang } from "../LangContext";
import { useT } from "@/lib/i18n";
import { Icon } from "../components";
import Showroom from "./Showroom";

interface Coaching {
  feedback: string;
  modelAnswer: string;
  strengths: string[];
  weaknesses: string[];
  unsupportedNumbers?: string[];
  delta: number;
}

export default function Coach() {
  const { lang } = useLang();
  const { t } = useT();
  const [personaId, setPersonaId] = useState(PERSONAS[0].id);
  const [history, setHistory] = useState<CoachTurn[]>([]);
  const [trust, setTrust] = useState(PERSONAS[0].trust.start);
  const [coaching, setCoaching] = useState<Coaching | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Nobody is talking until the trainee walks their salesperson over to someone.
  const [talkingTo, setTalkingTo] = useState<string | null>(null);
  const [walkReq, setWalkReq] = useState<{ id: string; n: number } | null>(null);

  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];

  // Start over whenever the customer or the language changes: a transcript that
  // switches person or tongue halfway is not one anyone can learn from.
  useEffect(() => {
    const opener = persona.openingQuestions[GENERATION_LANG]?.[0] ?? "";
    setHistory(opener ? [{ role: "customer", text: opener }] : []);
    setTrust(persona.trust.start);
    setCoaching(null);
    setError(null);
    setWarning(null);
  }, [personaId, persona, round]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [history, loading]);

  async function send() {
    const answer = draft.trim();
    if (!answer || loading) return;

    const next: CoachTurn[] = [...history, { role: "seller", text: answer }];
    setHistory(next);
    setDraft("");
    setLoading(true);
    setError(null);
    setCoaching(null);

    try {
      const r: CoachResponse = await coachTurn(personaId, next, trust, GENERATION_LANG);
      setTrust(r.trust);
      setWarning(r.warning ?? null);
      if (r.reply) setHistory([...next, { role: "customer", text: r.reply }]);
      setCoaching({
        feedback: r.feedback,
        modelAnswer: r.modelAnswer,
        strengths: r.strengths,
        weaknesses: r.weaknesses,
        unsupportedNumbers: r.unsupportedNumbers,
        delta: r.trustDelta,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }

  function startTalking(id: string) {
    if (loading) return;
    setTalkingTo(id);
    if (id !== personaId) setPersonaId(id);
    // Hand the keyboard to the answer box: from here on the trainee types.
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
  }

  const lastTurn = history[history.length - 1];
  const customerLine = talkingTo && lastTurn?.role === "customer" ? lastTurn.text : null;
  const sellerLine = lastTurn?.role === "seller" ? lastTurn.text : null;

  const trustTone = trust >= 60 ? "high" : trust >= 35 ? "mid" : "low";

  return (
    <>
      <h1>{t("co.title")}</h1>
      <p className="lede">{t("co.lede")}</p>

      <Showroom
        personas={PERSONAS}
        lang={lang}
        talkingTo={talkingTo}
        walkRequest={walkReq}
        onTalk={startTalking}
        customerLine={customerLine}
        sellerLine={sellerLine}
        thinking={loading}
        trust={trust}
      />

      {/* Same customers as on the plaza: pressing one walks your salesperson over. */}
      <div className="coach-picker">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            className={`coach-chip${p.id === talkingTo ? " active" : ""}`}
            onClick={() => setWalkReq({ id: p.id, n: Date.now() })}
            disabled={loading}
          >
            <span className="coach-chip-name">{p.name[lang]}</span>
            <span className="coach-chip-sub">{p.tagline[lang]}</span>
          </button>
        ))}
      </div>

      {/* The trainee is scored on quoting figures, so they have to be able to read
          them. Without this they were being marked down for numbers they had no way
          to look up, and the bar only ever went one direction. */}
      <details className="coach-sheet">
        <summary>{t("co.sheet", SPEC_SHEET.items.length)}</summary>
        <div className="coach-sheet-grid">
          {SPEC_SHEET.items.map((item) => (
            <div className="coach-sheet-row" key={item.key}>
              <span>{item.label[lang]}</span>
              <strong>{item.value}{item.unit[lang] ? ` ${item.unit[lang]}` : ""}</strong>
            </div>
          ))}
        </div>
        <div className="coach-sheet-note">{SPEC_SHEET.disclaimer[lang]}</div>
      </details>

      {!talkingTo && (
        <div className="card coach-meet">
          <Icon name="bulb" /> {t("co.stage.meet")}
        </div>
      )}

      {talkingTo && <div className="card">
        <div className="coach-trust-head">
          <span>{t("co.trust", persona.name[lang])}</span>
          <span className="coach-trust-value">
            {trust}%
            {coaching && coaching.delta !== 0 && (
              <span className={`coach-delta ${coaching.delta > 0 ? "up" : "down"}`}>
                {coaching.delta > 0 ? "+" : ""}{coaching.delta}
              </span>
            )}
          </span>
        </div>
        <div className="coach-trust-bar">
          <span className={`coach-trust-fill ${trustTone}`} style={{ width: `${trust}%` }} />
        </div>

        {/* Zero is an outcome, not a glitch: say the customer gave up and offer a
            fresh start, rather than leaving a dead red bar on screen. */}
        {trust === 0 && (
          <div className="coach-lost">
            <span>{t("co.lost", persona.name[lang])}</span>
            <button className="btn btn-ghost" onClick={() => setRound((r) => r + 1)}>{t("co.restart")}</button>
          </div>
        )}
        {warning && <div className="warn">{warning}</div>}
        {error && <div className="error">{t("co.err", error)}</div>}

        <div className="coach-thread">
          {history.map((turn, i) => (
            <div key={i} className={`coach-turn ${turn.role}`}>
              <div className="coach-who">
                {turn.role === "customer" ? persona.name[lang] : t("co.you")}
              </div>
              <div className="coach-bubble">{turn.text}</div>
            </div>
          ))}
          {loading && <div className="loading-row"><span className="spinner" />{t("co.thinking")}</div>}
          <div ref={endRef} />
        </div>

        <div className="coach-compose">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter breaks the line: this is a chat box.
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
            }}
            placeholder={t("co.placeholder")}
            rows={3}
          />
          <div className="coach-actions">
            <button className="btn" onClick={() => void send()} disabled={loading || !draft.trim()}>
              {loading ? t("co.sending") : t("co.send")}
            </button>
            <button className="btn btn-ghost" onClick={() => setRound((r) => r + 1)} disabled={loading}>
              {t("co.restart")}
            </button>
          </div>
        </div>
      </div>}

      {coaching && (
        <div className="card">
          <div className="section-title"><Icon name="bulb" /> {t("co.coaching")}</div>

          {(coaching.strengths.length > 0 || coaching.weaknesses.length > 0) && (
            <div className="coach-tags">
              {coaching.strengths.map((s) => <span key={s} className="coach-tag good">{t(`co.s.${s}`)}</span>)}
              {coaching.weaknesses.map((w) => <span key={w} className="coach-tag bad">{t(`co.w.${w}`)}</span>)}
            </div>
          )}

          {coaching.feedback && <p className="coach-feedback">{coaching.feedback}</p>}

          {/* The trainee gets the same check as the model: quote a figure the spec
              sheet does not carry and you hear about it. */}
          {coaching.unsupportedNumbers && coaching.unsupportedNumbers.length > 0 && (
            <div className="coach-invented">
              <Icon name="shield" size={15} /> {t("co.invented", coaching.unsupportedNumbers.join(", "))}
            </div>
          )}

          {coaching.modelAnswer && (
            <>
              <div className="coach-model-head">{t("co.model")}</div>
              <blockquote className="coach-model">{coaching.modelAnswer}</blockquote>
            </>
          )}
        </div>
      )}
    </>
  );
}

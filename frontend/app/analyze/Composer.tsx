"use client";

// Act 1 of the analyse page: instead of a form, the post is written straight into a
// phone mock-up, templates fly into it, and audiences are set on the three stations
// the car will later drive past. Same values as the old form; only the surface changed.

import { useRef } from "react";
import { MODELS } from "@/lib/config";
import { useT } from "@/lib/i18n";
import type { Source } from "@/lib/types";
import { InfoTip } from "../components";
import { ClipStrip, PostMedia, TikTokView, type ClipStyle } from "./Clip";
import type { VideoReport } from "@/lib/video-probe";

const MIN_EXP = 2; // 100
const MAX_EXP = 7; // 10M
const NETS: { source: Exclude<Source, "">; name: string; color: string }[] = [
  { source: "youtube", name: "YouTube", color: "#e0362c" },
  { source: "x", name: "X", color: "#0f1b2d" },
  { source: "reddit", name: "Reddit", color: "#ff5a1f" },
];

function roundAudience(exp: number) {
  const raw = Math.pow(10, exp);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
  return Math.round(raw / mag) * mag;
}
function compact(n: number, lang: string) {
  return new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

interface Props {
  title: string;
  setTitle: (v: string) => void;
  text: string;
  setText: (v: string) => void;
  addTemplate: (v: string) => void;
  audiences: Record<"youtube" | "x" | "reddit", string>;
  setAudience: (s: "youtube" | "x" | "reddit", v: string) => void;
  model: string;
  setModel: (id: string) => void;
  examples: { label: string; text: string }[];
  templates: { role: string; text: string }[];
  onLaunch: () => void;
  launchLabel: string;
  launchDisabled: boolean;
  status?: React.ReactNode;
  /** Compare mode: several versions of the post, one tab each, edited in the same phone. */
  versions?: { count: number; active: number; setActive: (i: number) => void; add: () => void; remove: (i: number) => void; filled: boolean[] };
  /** Optional video attached to the post (single-post mode). */
  clip?: {
    src: string | null; style: ClipStyle; setStyle: (s: ClipStyle) => void;
    busy: boolean; progress: number; report: VideoReport | null;
    attach: (f: File) => void; sample: () => void; remove: () => void;
  };
}

export default function Composer(p: Props) {
  const { t, lang } = useT();
  const phoneRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const clipFile = useRef<HTMLInputElement>(null);

  // A ghost of the chip flies into the phone, then the text lands. Pure decoration:
  // the text is added either way, and reduced motion skips the flight.
  function flyTemplate(e: React.MouseEvent<HTMLButtonElement>, text: string) {
    const from = e.currentTarget.getBoundingClientRect();
    const to = phoneRef.current?.getBoundingClientRect();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const land = () => {
      p.addTemplate(text);
      phoneRef.current?.classList.remove("pulse");
      void phoneRef.current?.offsetWidth;
      phoneRef.current?.classList.add("pulse");
    };
    if (!to || reduce) { land(); return; }
    const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
    ghost.classList.add("tmpl-ghost");
    Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px` });
    document.body.appendChild(ghost);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height * 0.55 - (from.top + from.height / 2);
    const anim = ghost.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(1.08)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(.4)`, opacity: 0 },
      ],
      { duration: 620, easing: "cubic-bezier(.3,.7,.4,1)" },
    );
    anim.onfinish = () => { ghost.remove(); land(); };
  }

  const words = p.text.trim() ? p.text.trim().split(/\s+/).length : 0;

  return (
    <div className="composer card">
      <div className="composer-grid">
        {/* ---- the phone: the post as it will appear ---- */}
        <div className="phone-col desk">
          <div className="step-label"><b>1</b>{lang === "vi" ? "Viết bài" : "Write the post"}</div>
          <div className={`phone${p.clip?.src && p.clip.style === "tiktok" ? " phone-tt" : ""}`} ref={phoneRef}>
            <div className="phone-notch" aria-hidden="true" />
            <div className="post-head">
              <span className="post-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" /></svg>
              </span>
              <div className="post-who">
                <input
                  className="post-title"
                  value={p.title}
                  onChange={(e) => p.setTitle(e.target.value)}
                  placeholder={t("an.campaign.ph")}
                  aria-label={t("an.campaign")}
                />
                <span className="post-meta">{t("an.stage.justnow")}</span>
              </div>
            </div>
            {p.versions && (
              <div className="ver-tabs" role="tablist" aria-label={lang === "vi" ? "Các phiên bản" : "Versions"}>
                {Array.from({ length: p.versions.count }, (_, i) => (
                  <span key={i} className={`ver-tab${i === p.versions!.active ? " on" : ""}${p.versions!.filled[i] ? " filled" : ""}`}>
                    <button type="button" role="tab" aria-selected={i === p.versions!.active} onClick={() => p.versions!.setActive(i)}>
                      {lang === "vi" ? `Bản ${i + 1}` : `Version ${i + 1}`}
                    </button>
                    {p.versions!.count > 2 && i === p.versions!.active && (
                      <button type="button" className="ver-x" onClick={() => p.versions!.remove(i)} aria-label={lang === "vi" ? `Xóa bản ${i + 1}` : `Remove version ${i + 1}`}>×</button>
                    )}
                  </span>
                ))}
                {p.versions.count < 5 && (
                  <button type="button" className="ver-add" onClick={p.versions.add}>{lang === "vi" ? "+ Thêm bản" : "+ Add"}</button>
                )}
              </div>
            )}
            {p.clip?.src && p.clip.style === "tiktok" ? (
              <TikTokView src={p.clip.src} caption={p.text} account={p.title} onEdit={() => p.clip!.setStyle("post")} />
            ) : (
              <textarea
                ref={taRef}
                className={`post-body${p.clip?.src ? " with-media" : ""}`}
                value={p.text}
                onChange={(e) => p.setText(e.target.value)}
                placeholder={t("an.post.ph")}
                aria-label={t("an.post")}
              />
            )}
            {p.clip?.src && p.clip.style === "post" && <PostMedia src={p.clip.src} />}
            <div className="post-foot" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4V5Z" /></svg>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4l6 6-6 6M20 10H9a5 5 0 0 0-5 5v4" /></svg>
              <span className="post-count">{t("an.stage.words", words)}</span>
            </div>
          </div>

          <div className="chip-row">
            <span className="chip-lbl">{t("an.try")}</span>
            {p.examples.map((ex) => (
              <button key={ex.label} className="example-chip" onClick={() => p.setText(t(ex.text))}>{t(ex.label)}</button>
            ))}
          </div>
          {p.clip && (
            <div className="clip-row">
              <span className="chip-lbl">{lang === "vi" ? "Video:" : "Video:"}</span>
              {!p.clip.src ? (
                <>
                  <button type="button" className="example-chip" onClick={() => clipFile.current?.click()}>
                    {lang === "vi" ? "+ Gắn video" : "+ Attach a video"}
                  </button>
                  <button type="button" className="tmpl-chip" onClick={p.clip.sample}>{lang === "vi" ? "Dùng video mẫu" : "Use the sample video"}</button>
                </>
              ) : (
                <>
                  <span className="clip-style" role="tablist" aria-label={lang === "vi" ? "Xem như" : "Show as"}>
                    <button role="tab" aria-selected={p.clip.style === "post"} className={p.clip.style === "post" ? "on" : ""} onClick={() => p.clip!.setStyle("post")}>{lang === "vi" ? "Bài đăng" : "Post"}</button>
                    <button role="tab" aria-selected={p.clip.style === "tiktok"} className={p.clip.style === "tiktok" ? "on" : ""} onClick={() => p.clip!.setStyle("tiktok")}>TikTok / Reels</button>
                  </span>
                  <button type="button" className="clip-remove" onClick={p.clip.remove}>{lang === "vi" ? "Bỏ video" : "Remove video"}</button>
                </>
              )}
              <input ref={clipFile} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) p.clip!.attach(f); e.target.value = ""; }} />
            </div>
          )}
          {p.clip && <ClipStrip report={p.clip.report} busy={p.clip.busy} progress={p.clip.progress} />}
          <div className="chip-row">
            <span className="chip-lbl">{t("an.addtmpl")}</span>
            {p.templates.map((tm) => (
              <button key={tm.role} className="tmpl-chip" onClick={(e) => flyTemplate(e, t(tm.text))} title={t(tm.text)}>+ {t(tm.role)}</button>
            ))}
          </div>
        </div>

        {/* ---- the route: three stations, one engine, one start button ---- */}
        <div className="route-col">
          <div className="step-label"><b>2</b>{lang === "vi" ? "Người theo dõi ở từng trạm" : "Your audience at each stop"} <InfoTip term="audience" /> <span className="muted">{t("an.optional")}</span></div>
          <div className="route">
            {NETS.map((n, i) => {
              const raw = p.audiences[n.source];
              const val = raw ? Number(raw) : null;
              const exp = val ? Math.min(MAX_EXP, Math.max(MIN_EXP, Math.log10(val))) : (MIN_EXP + MAX_EXP) / 2;
              const people = val ? Math.max(1, Math.min(8, Math.round((exp - MIN_EXP) * 1.5) + 1)) : 0;
              return (
                <div key={n.source} className={`route-stop${val ? " set" : ""}`} style={{ "--net": n.color } as React.CSSProperties}>
                  <div className="route-pin" aria-hidden="true"><b>{i + 1}</b></div>
                  <div className="route-body">
                    <div className="route-top">
                      <strong>{n.name}</strong>
                      <span className="route-crowd" aria-hidden="true">
                        {Array.from({ length: people }, (_, k) => <i key={k} style={{ animationDelay: `${k * 40}ms` }} />)}
                      </span>
                      <span className="route-val">
                        {val ? compact(val, lang) : t("an.stage.unknown")}
                        {val ? <button className="route-clear" onClick={() => p.setAudience(n.source, "")} aria-label={t("an.stage.clear")}>×</button> : null}
                      </span>
                    </div>
                    <input
                      type="range" min={MIN_EXP} max={MAX_EXP} step={0.05} value={exp}
                      onChange={(e) => p.setAudience(n.source, String(roundAudience(Number(e.target.value))))}
                      aria-label={t(`an.aud.${n.source === "youtube" ? "yt" : n.source === "x" ? "x" : "rd"}`)}
                      aria-valuetext={val ? compact(val, lang) : t("an.stage.unknown")}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="step-label" style={{ marginTop: 22 }}><b>3</b>{lang === "vi" ? "Chọn mô hình chấm điểm" : "Pick the scoring model"}</div>
          <div className="engine-row" role="radiogroup" aria-label={t("an.model")}>
            {MODELS.map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={m.id === p.model}
                className={`engine${m.id === p.model ? " on" : ""}`}
                onClick={() => p.setModel(m.id)}
              >
                <span className="engine-name">{m.name}</span>
                <span className="engine-blurb">{t(`model.${m.id}.blurb`)}</span>
              </button>
            ))}
          </div>

          <button className="launch" onClick={p.onLaunch} disabled={p.launchDisabled}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {p.launchLabel}
          </button>
          {p.status}
        </div>
      </div>
    </div>
  );
}

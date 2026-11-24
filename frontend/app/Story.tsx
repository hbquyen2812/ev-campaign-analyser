"use client";

// The landing page's "why": one road down the page. The car stays mid-screen while the
// road scrolls under it, so scrolling is driving. Each chapter is a roadside sign; its
// figures sit on LED boards that charge up the first time they come into view. Every
// figure carries its source, because a pitch about trust cannot cite numbers nobody
// can check.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types";
import { useLang } from "./LangContext";
import { CHAPTERS, INTRO, type Figure, type StoryChapter } from "./story-content";

type L = Record<Lang, string>;

function useInView<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, seen };
}

function CountUp({ to, decimals = 0, run, lang }: { to: number; decimals?: number; run: boolean; lang: Lang }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(to); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min((now - start) / 1400, 1);
      setV(to * (1 - Math.pow(1 - k, 4)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);
  return <>{v.toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

function Board({ f, run, lang }: { f: Figure; run: boolean; lang: Lang }) {
  return (
    <figure className="board">
      <div className="board-screen">
        <span className="board-num">
          {f.prefix?.[lang]}<CountUp to={f.value} decimals={f.decimals} run={run} lang={lang} />
          {f.unit && <small>{f.unit[lang]}</small>}
        </span>
      </div>
      <figcaption>
        <span className="board-label">{f.label[lang]}</span>
        {f.source.url.startsWith("/")
          ? <Link className="board-src" href={f.source.url}>{f.source.name[lang]}</Link>
          : <a className="board-src" href={f.source.url} target="_blank" rel="noreferrer">{f.source.name[lang]}</a>}
      </figcaption>
    </figure>
  );
}

function Chapter({ ch, n, lang }: { ch: StoryChapter; n: number; lang: Lang }) {
  const { ref, seen } = useInView<HTMLElement>(0.25);
  return (
    <article ref={ref} className={`chap${seen ? " in" : ""}${ch.tone ? ` chap--${ch.tone}` : ""}`} id={ch.id}>
      <span className="km" aria-hidden="true">Km {n}</span>
      <div className="chap-sign">
        <h2>{ch.title[lang]}</h2>
      </div>
      <div className="chap-body">
        {ch.body.map((p, i) => <p key={i}>{p[lang]}</p>)}
      </div>
      {ch.figures && (
        <div className="boards">
          {ch.figures.map((f, i) => <Board key={i} f={f} run={seen} lang={lang} />)}
        </div>
      )}
      {ch.quotes && (
        <div className="voices">
          {ch.quotes.map((q, i) => (
            <blockquote key={i} className="voice" style={{ transitionDelay: `${300 + i * 260}ms` }}>
              <p>{q.text}</p>
              <cite>{q.where[lang]}</cite>
            </blockquote>
          ))}
        </div>
      )}
      {ch.exits && (
        <nav className="exits" aria-label={ch.title[lang]}>
          {ch.exits.map((x) => (
            <Link key={x.href} href={x.href} className="exit">
              <span className="exit-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 19 19 5M9 5h10v10" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="exit-text"><strong>{x.label[lang]}</strong><span>{x.sub[lang]}</span></span>
            </Link>
          ))}
        </nav>
      )}
      {ch.note && <p className="chap-note">{ch.note[lang]}</p>}
    </article>
  );
}

export default function Story({ intro = INTRO, onSwitch, switchLabel }: { intro?: { title: L; sub: L; cue: L }; onSwitch?: () => void; switchLabel?: string }) {
  const { lang } = useLang();
  const wrap = useRef<HTMLDivElement>(null);

  // Battery on the car = how far down the story you are. One CSS variable, no re-render.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight * 0.5;
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.45 - r.top) / Math.max(1, span)));
      el.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="story" ref={wrap}>
      <div className="road" aria-hidden="true">
        <div className="road-car">
          <svg viewBox="0 0 64 104">
            <ellipse cx="32" cy="98" rx="24" ry="5" fill="rgba(0,0,0,.25)" />
            <rect x="6" y="6" width="52" height="90" rx="20" fill="#fff" stroke="#0b4ea2" strokeWidth="3.5" />
            <rect x="2" y="20" width="7" height="16" rx="3" fill="#1b2a40" />
            <rect x="55" y="20" width="7" height="16" rx="3" fill="#1b2a40" />
            <rect x="2" y="66" width="7" height="16" rx="3" fill="#1b2a40" />
            <rect x="55" y="66" width="7" height="16" rx="3" fill="#1b2a40" />
            <path d="M14 66 Q32 58 50 66 L48 80 Q32 76 16 80Z" fill="#cfe6fb" />
            <path d="M16 26 Q32 22 48 26 L50 38 Q32 34 14 38Z" fill="#a9cdf0" />
            <rect x="18" y="42" width="28" height="18" rx="4" fill="#0a1626" />
            <rect className="car-bat" x="20.5" y="44.5" width="23" height="13" rx="2" fill="#3be08a" />
            <rect x="14" y="90" width="10" height="4" rx="2" fill="#ffc20e" />
            <rect x="40" y="90" width="10" height="4" rx="2" fill="#ffc20e" />
          </svg>
          <span className="road-glow" />
        </div>
      </div>

      <header className="story-intro">
        <h1>{intro.title[lang]}</h1>
        <p>{intro.sub[lang]}</p>
        <a href={`#${CHAPTERS[0].id}`} className="story-cue">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 4v16M5 13l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {intro.cue[lang]}
        </a>
        {onSwitch && <button type="button" className="story-switch" onClick={onSwitch}>{switchLabel}</button>}
      </header>

      {CHAPTERS.map((ch, i) => <Chapter key={ch.id} ch={ch} n={(i + 1) * 10} lang={lang} />)}
    </div>
  );
}

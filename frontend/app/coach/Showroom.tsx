"use client";

// A cartoon EV plaza for the practice page. The virtual customers wander about;
// the trainee walks their own salesperson over (keys or click) and starts the
// conversation when they are close enough. The chat itself still lives below —
// this is only the way in, plus speech bubbles so the scene follows the talk.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang, Persona } from "@/lib/types";
import { useT } from "@/lib/i18n";

// Virtual stage, in "px" of a 1000x420 drawing. Characters stand on the floor band.
const W = 1000;
const H = 420;
const FLOOR_TOP = 262;
const FLOOR_BOTTOM = 404;
const X_MIN = 60;
const X_MAX = 940;
const PLAYER_SPEED = 250; // virtual px per second
const NPC_SPEED = 62;
const TALK_DX = 120; // how close counts as "next to"
const TALK_DY = 56;
const STAND_OFF = 82; // where the player stops beside a customer

export type Mood = "happy" | "neutral" | "worried";

export interface Look {
  shirt: string;
  pants: string;
  skin: string;
  hair: string;
  style: "short" | "long" | "cap" | "neat";
  prop?: "calculator" | "umbrella" | "backpack" | "badge";
}

const LOOKS: Record<string, Look> = {
  "tinh-toan": { shirt: "#f5a524", pants: "#3a4a60", skin: "#f1c7a0", hair: "#2b2118", style: "short", prop: "calculator" },
  "lo-ngap": { shirt: "#0e6f77", pants: "#56667c", skin: "#f3cfae", hair: "#3b2416", style: "long", prop: "umbrella" },
  "sinh-vien": { shirt: "#e0576f", pants: "#1f3b66", skin: "#eec19b", hair: "#1a1a1a", style: "cap", prop: "backpack" },
};
const FALLBACK_LOOKS: Look[] = [
  { shirt: "#7c5cd6", pants: "#3a4a60", skin: "#f1c7a0", hair: "#5a3a1a", style: "short" },
  { shirt: "#c2410c", pants: "#1f3b66", skin: "#e9b88f", hair: "#222", style: "long" },
];
const PLAYER_LOOK: Look = { shirt: "#0e8a45", pants: "#0f1b2d", skin: "#f0c39c", hair: "#1d1a17", style: "neat", prop: "badge" };

export const lookFor = (id: string, i: number) => LOOKS[id] ?? FALLBACK_LOOKS[i % FALLBACK_LOOKS.length];

interface Body {
  x: number;
  y: number;
  face: 1 | -1;
  moving: boolean;
}
interface Npc extends Body {
  id: string;
  tx: number;
  ty: number;
  wait: number;
}
interface Player extends Body {
  /** Click-to-move destination, or null while steering with keys. */
  dest: { x: number; y: number } | null;
  /** Persona the player is walking over to; talking starts on arrival. */
  goal: string | null;
}

const clampX = (x: number) => Math.max(X_MIN, Math.min(X_MAX, x));
const clampY = (y: number) => Math.max(FLOOR_TOP + 10, Math.min(FLOOR_BOTTOM, y));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const depthScale = (y: number) => 0.82 + 0.3 * ((y - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP));

function place(el: HTMLElement | null, b: Body) {
  if (!el) return;
  el.style.left = `${(b.x / W) * 100}%`;
  el.style.top = `${(b.y / H) * 100}%`;
  el.style.zIndex = String(Math.round(b.y));
  el.style.setProperty("--s", depthScale(b.y).toFixed(3));
  el.classList.toggle("walking", b.moving);
  el.classList.toggle("flip", b.face < 0);
}

interface Props {
  personas: Persona[];
  lang: Lang;
  /** Persona currently in conversation, or null before the first meeting. */
  talkingTo: string | null;
  /** Ask the player to walk over to someone (from the chips under the scene). */
  walkRequest: { id: string; n: number } | null;
  onTalk: (id: string) => void;
  customerLine: string | null;
  sellerLine: string | null;
  thinking: boolean;
  trust: number;
}

export default function Showroom({
  personas, lang, talkingTo, walkRequest, onTalk, customerLine, sellerLine, thinking, trust,
}: Props) {
  const { t } = useT();
  const stageRef = useRef<HTMLDivElement>(null);
  const playerEl = useRef<HTMLDivElement>(null);
  const npcEls = useRef<Record<string, HTMLDivElement | null>>({});
  const keys = useRef(new Set<string>());
  const talkingRef = useRef(talkingTo);
  const onTalkRef = useRef(onTalk);
  const [near, setNear] = useState<string | null>(null);
  const nearRef = useRef<string | null>(null);

  talkingRef.current = talkingTo;
  onTalkRef.current = onTalk;

  const player = useRef<Player>({ x: 500, y: 360, face: 1, moving: false, dest: null, goal: null });
  const npcs = useRef<Npc[]>([]);
  if (npcs.current.length !== personas.length) {
    // Spread the customers out across the plaza so nobody starts on top of anyone.
    npcs.current = personas.map((p, i) => {
      const x = 170 + (i * (W - 340)) / Math.max(1, personas.length - 1);
      const y = i % 2 ? 300 : 340;
      return { id: p.id, x, y, tx: x, ty: y, face: i % 2 ? -1 : 1, moving: false, wait: rand(0.5, 2.5) };
    });
  }

  const talk = useCallback((id: string) => {
    const p = player.current;
    p.goal = null;
    p.dest = null;
    onTalkRef.current(id);
  }, []);

  // A chip below the scene was pressed: walk there rather than teleporting.
  useEffect(() => {
    if (walkRequest) {
      player.current.goal = walkRequest.id;
      player.current.dest = null;
    }
  }, [walkRequest]);

  // Game loop. Positions live in refs and go straight to the DOM, so the page
  // (and its chat) does not re-render sixty times a second.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = player.current;

      // ---- player ----
      let vx = 0;
      let vy = 0;
      const k = keys.current;
      if (k.has("ArrowLeft") || k.has("a")) vx -= 1;
      if (k.has("ArrowRight") || k.has("d")) vx += 1;
      if (k.has("ArrowUp") || k.has("w")) vy -= 1;
      if (k.has("ArrowDown") || k.has("s")) vy += 1;
      if (vx || vy) { p.dest = null; p.goal = null; }

      if (p.goal) {
        const n = npcs.current.find((m) => m.id === p.goal);
        if (n) {
          const side = p.x < n.x ? -1 : 1;
          p.dest = { x: clampX(n.x + side * STAND_OFF), y: n.y };
        }
      }
      if (p.dest) {
        const dx = p.dest.x - p.x;
        const dy = p.dest.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 4) {
          p.dest = null;
          if (p.goal) talk(p.goal);
        } else {
          vx = dx / d;
          vy = dy / d;
        }
      }
      if (vx || vy) {
        const len = Math.hypot(vx, vy) || 1;
        p.x = clampX(p.x + (vx / len) * PLAYER_SPEED * dt);
        p.y = clampY(p.y + (vy / len) * PLAYER_SPEED * 0.7 * dt);
        if (Math.abs(vx) > 0.05) p.face = vx > 0 ? 1 : -1;
        p.moving = true;
      } else {
        p.moving = false;
      }

      // ---- customers ----
      let closest: string | null = null;
      let best = Infinity;
      for (const n of npcs.current) {
        const busy = n.id === talkingRef.current || n.id === p.goal;
        if (busy) {
          n.moving = false;
          n.face = p.x < n.x ? -1 : 1;
        } else if (!reduce) {
          const dx = n.tx - n.x;
          const dy = n.ty - n.y;
          const d = Math.hypot(dx, dy);
          if (d < 3) {
            n.moving = false;
            n.wait -= dt;
            if (n.wait <= 0) {
              n.tx = clampX(n.x + rand(-260, 260));
              n.ty = clampY(rand(FLOOR_TOP + 20, FLOOR_BOTTOM - 10));
              n.wait = rand(1.5, 4.5);
            }
          } else {
            n.x += (dx / d) * NPC_SPEED * dt;
            n.y += (dy / d) * NPC_SPEED * 0.7 * dt;
            if (Math.abs(dx) > 1) n.face = dx > 0 ? 1 : -1;
            n.moving = true;
          }
        }
        const ax = Math.abs(n.x - p.x);
        const ay = Math.abs(n.y - p.y);
        if (ax < TALK_DX && ay < TALK_DY && ax + ay < best) { best = ax + ay; closest = n.id; }
        place(npcEls.current[n.id], n);
      }
      place(playerEl.current, p);

      if (closest !== nearRef.current) {
        nearRef.current = closest;
        setNear(closest);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [talk]);

  // Keys only steer while the scene has focus, so typing an answer never moves anyone.
  function onKeyDown(e: React.KeyboardEvent) {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s"].includes(key)) {
      e.preventDefault();
      keys.current.add(key);
    } else if ((key === "e" || key === "Enter" || key === " ") && nearRef.current) {
      e.preventDefault();
      talk(nearRef.current);
    }
  }
  function onKeyUp(e: React.KeyboardEvent) {
    keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }

  function onPointerDown(e: React.PointerEvent) {
    const stage = stageRef.current;
    if (!stage) return;
    stage.focus({ preventScroll: true });
    const hit = (e.target as HTMLElement).closest<HTMLElement>("[data-npc]");
    const p = player.current;
    if (hit?.dataset.npc) {
      p.goal = hit.dataset.npc;
      return;
    }
    const r = stage.getBoundingClientRect();
    p.goal = null;
    p.dest = {
      x: clampX(((e.clientX - r.left) / r.width) * W),
      y: clampY(((e.clientY - r.top) / r.height) * H),
    };
  }

  const mood: Mood = trust >= 60 ? "happy" : trust >= 35 ? "neutral" : "worried";
  const lastSpeaker = thinking ? "seller" : customerLine ? "customer" : null;

  return (
    <div className="showroom-wrap">
      <div
        ref={stageRef}
        className="showroom"
        tabIndex={0}
        role="application"
        aria-label={t("co.stage.label")}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={() => keys.current.clear()}
        onPointerDown={onPointerDown}
      >
        <Backdrop />

        {personas.map((p, i) => {
          const isTalking = p.id === talkingTo;
          return (
            <div key={p.id} ref={(el) => { npcEls.current[p.id] = el; }} className="sr-actor" data-npc={p.id}>
              {isTalking && (thinking || customerLine) && (
                <div className={`sr-bubble${lastSpeaker === "customer" ? "" : " dots"}`}>
                  {thinking ? <span className="sr-dots"><i /><i /><i /></span> : customerLine}
                </div>
              )}
              {!isTalking && near === p.id && (
                <button
                  className="sr-ask"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => talk(p.id)}
                >
                  <kbd>E</kbd> {t("co.stage.ask")}
                </button>
              )}
              <Person look={lookFor(p.id, i)} mood={isTalking ? mood : "neutral"} />
              <div className={`sr-name${isTalking ? " on" : ""}`}>{p.name[lang]}</div>
            </div>
          );
        })}

        <div ref={playerEl} className="sr-actor sr-player">
          {thinking && sellerLine && <div className="sr-bubble me">{sellerLine}</div>}
          <Person look={PLAYER_LOOK} mood="happy" />
          <div className="sr-name me">{t("co.you")}</div>
        </div>

        <div className="sr-hint">{t("co.stage.hint")}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Person({ look, mood, className = "sr-person", ...svg }: { look: Look; mood: Mood; className?: string } & Omit<React.SVGProps<SVGSVGElement>, "className">) {
  const mouth =
    mood === "happy" ? "M24 34 Q30 40 36 34" : mood === "worried" ? "M24 37 Q30 32 36 37" : "M25 35.5 L35 35.5";
  return (
    <svg className={className} viewBox="0 0 60 120" aria-hidden="true" {...svg}>
      <ellipse cx="30" cy="116" rx="17" ry="3.6" fill="rgba(15,27,45,.18)" className="sr-shadow" />
      {look.prop === "backpack" && <rect x="34" y="47" width="15" height="28" rx="6" fill="#ffc20e" stroke="#c99400" strokeWidth="1.5" />}
      {look.prop === "umbrella" && (
        <g className="sr-umbrella">
          <line x1="47" y1="70" x2="47" y2="4" stroke="#33414f" strokeWidth="2" />
          <path d="M22 16 Q47 -10 72 16 Q65 11 59.5 16 Q53 11 47 16 Q41 11 34.5 16 Q29 11 22 16Z" fill="#0b4ea2" />
        </g>
      )}
      <g className="sr-body">
        {/* back leg + arm first so the front ones overlap them */}
        <rect className="sr-leg b" x="25" y="80" width="8" height="32" rx="4" fill={look.pants} />
        <rect className="sr-arm b" x="34" y="48" width="7" height="27" rx="3.5" fill={look.shirt} style={{ filter: "brightness(.85)" }} />
        <rect className="sr-leg f" x="25" y="80" width="8" height="32" rx="4" fill={look.pants} />
        <rect x="16" y="45" width="28" height="40" rx="11" fill={look.shirt} />
        {look.prop === "badge" && <rect x="31" y="53" width="9" height="6" rx="1.5" fill="#fff" />}
        {look.prop === "backpack" && <path d="M36 47 L33 72" stroke="#c99400" strokeWidth="2.5" strokeLinecap="round" />}
        <g className="sr-arm f">
          <rect x="21" y="48" width="7" height="27" rx="3.5" fill={look.shirt} style={{ filter: "brightness(.92)" }} />
          <circle cx="24.5" cy="76" r="4" fill={look.skin} />
          {look.prop === "calculator" && (
            <g>
              <rect x="18" y="71" width="12" height="15" rx="2" fill="#0a1626" />
              <rect x="20" y="73" width="8" height="4" rx="1" fill="#3be08a" />
            </g>
          )}
        </g>
        <circle cx="30" cy="26" r="15" fill={look.skin} />
        <Hair look={look} />
        <g className="sr-eyes">
          <circle cx="25" cy="26" r="1.9" fill="#0f1b2d" />
          <circle cx="35" cy="26" r="1.9" fill="#0f1b2d" />
        </g>
        {look.prop === "calculator" && (
          <g fill="none" stroke="#0f1b2d" strokeWidth="1.4">
            <circle cx="25" cy="26" r="4.2" />
            <circle cx="35" cy="26" r="4.2" />
            <line x1="29.2" y1="26" x2="30.8" y2="26" />
          </g>
        )}
        <path d={mouth} fill="none" stroke="#7a2e1f" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="20.5" cy="31" r="2.4" fill="#f08a7a" opacity=".45" />
        <circle cx="39.5" cy="31" r="2.4" fill="#f08a7a" opacity=".45" />
      </g>
    </svg>
  );
}

function Hair({ look }: { look: Look }) {
  switch (look.style) {
    case "long":
      return <path d="M14 28 Q12 8 30 9 Q48 8 46 28 L47 48 Q42 44 42 30 Q36 18 22 20 Q18 30 18 44 Q13 46 13 46Z" fill={look.hair} />;
    case "cap":
      return (
        <g>
          <path d="M15 22 Q16 9 30 9 Q44 9 45 22Z" fill="#0b4ea2" />
          <rect x="38" y="19" width="15" height="4" rx="2" fill="#083b7a" />
        </g>
      );
    case "neat":
      return <path d="M15 24 Q14 9 30 10 Q46 9 45 24 Q40 16 30 17 Q22 16 15 24Z" fill={look.hair} />;
    default:
      return <path d="M15 23 Q15 8 30 9 Q45 8 45 23 L42 18 L38 21 L33 16 L28 20 L23 16 L19 21Z" fill={look.hair} />;
  }
}

function Backdrop() {
  return (
    <svg className="sr-bg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fd2ff" />
          <stop offset="1" stopColor="#e9f5ff" />
        </linearGradient>
        <linearGradient id="sr-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6dee8" />
          <stop offset="1" stopColor="#eef2f7" />
        </linearGradient>
        <linearGradient id="sr-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cfe6fb" />
          <stop offset="1" stopColor="#8fb9e0" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill="url(#sr-sky)" />
      <circle cx="870" cy="62" r="34" fill="#ffd95a" />
      <circle cx="870" cy="62" r="46" fill="#ffd95a" opacity=".25" />

      <g className="sr-cloud c1"><Cloud x={120} y={60} s={1} /></g>
      <g className="sr-cloud c2"><Cloud x={520} y={40} s={0.8} /></g>
      <g className="sr-cloud c3"><Cloud x={760} y={110} s={0.65} /></g>

      {/* far skyline */}
      <g fill="#c4d3e6">
        <rect x="0" y="150" width="70" height="110" />
        <rect x="60" y="120" width="50" height="140" />
        <rect x="610" y="130" width="60" height="130" />
        <rect x="660" y="160" width="80" height="100" />
        <rect x="900" y="140" width="100" height="120" />
      </g>
      <g fill="#e6eef8" opacity=".8">
        {[0, 1, 2, 3, 4].map((r) => [0, 1].map((c) => (
          <rect key={`${r}${c}`} x={70 + c * 18} y={132 + r * 22} width="10" height="12" rx="1" />
        )))}
        {[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => (
          <rect key={`b${r}${c}`} x={916 + c * 26} y={154 + r * 24} width="14" height="12" rx="1" />
        )))}
      </g>

      {/* showroom building */}
      <rect x="150" y="128" width="420" height="140" rx="6" fill="#f6f9fc" stroke="#cdd6e2" strokeWidth="2" />
      <rect x="168" y="168" width="384" height="96" rx="3" fill="url(#sr-glass)" />
      {[264, 360, 456].map((x) => <rect key={x} x={x} y="168" width="4" height="96" fill="#f6f9fc" />)}
      <path d="M180 250 L230 180 M290 250 L330 195 M390 250 L420 205 M480 250 L520 190" stroke="#fff" strokeWidth="6" opacity=".35" />
      {/* sign in the site's direction-sign style */}
      <rect x="280" y="138" width="160" height="26" rx="6" fill="#0b4ea2" />
      <rect x="284" y="141" width="152" height="20" rx="4" fill="none" stroke="#fff" strokeWidth="1.6" />
      <text x="360" y="156" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" fontFamily="Barlow Semi Condensed, Barlow, sans-serif">EV SHOWROOM</text>

      {/* trees */}
      <Tree x={110} y={268} />
      <Tree x={600} y={268} s={0.85} />

      {/* charging station + parked car */}
      <g>
        <rect x="770" y="176" width="40" height="92" rx="8" fill="#0b4ea2" />
        <rect x="777" y="186" width="26" height="22" rx="3" fill="#0a1626" />
        <rect x="781" y="196" width="18" height="5" rx="1.5" fill="#3be08a" className="sr-led" />
        <path d="M790 220 l-5 10 h6 l-4 10" stroke="#ffc20e" strokeWidth="3" fill="none" strokeLinejoin="round" />
        <path d="M810 236 Q840 260 852 238" stroke="#0f1b2d" strokeWidth="3" fill="none" />
      </g>
      <g>
        <path d="M830 262 Q832 230 862 224 L890 206 Q905 198 930 198 L968 200 Q988 204 996 230 L998 262Z" fill="#ffffff" stroke="#9fb2c8" strokeWidth="2" />
        <path d="M876 226 L897 210 Q906 205 925 205 L930 226Z" fill="#8fb9e0" />
        <path d="M936 205 L962 206 Q976 210 982 226 L936 226Z" fill="#8fb9e0" />
        <circle cx="866" cy="263" r="14" fill="#1b2a40" /><circle cx="866" cy="263" r="6" fill="#cdd6e2" />
        <circle cx="962" cy="263" r="14" fill="#1b2a40" /><circle cx="962" cy="263" r="6" fill="#cdd6e2" />
        <rect x="838" y="238" width="10" height="5" rx="2" fill="#3be08a" />
      </g>

      {/* plaza floor */}
      <rect x="0" y="258" width={W} height={H - 258} fill="url(#sr-floor)" />
      <rect x="0" y="256" width={W} height="6" fill="#b9c6d6" />
      <g stroke="#c9d3df" strokeWidth="1.5">
        {[300, 350].map((y) => <line key={y} x1="0" y1={y} x2={W} y2={y} />)}
        {Array.from({ length: 11 }, (_, i) => {
          const top = i * 100;
          const bottom = 500 + (top - 500) * 1.5;
          return <line key={i} x1={top} y1="262" x2={bottom} y2={H} />;
        })}
      </g>
      <rect x="0" y={H - 12} width={W} height="12" fill="#7cc576" />
    </svg>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff">
      <ellipse cx="0" cy="10" rx="46" ry="16" />
      <circle cx="-16" cy="2" r="18" />
      <circle cx="12" cy="-4" r="22" />
    </g>
  );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-5" y="-50" width="10" height="50" rx="3" fill="#8a5a33" />
      <circle cx="0" cy="-70" r="30" fill="#3fa968" />
      <circle cx="-20" cy="-56" r="20" fill="#349a5c" />
      <circle cx="20" cy="-58" r="21" fill="#4bb975" />
    </g>
  );
}

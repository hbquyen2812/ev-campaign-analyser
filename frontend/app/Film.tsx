"use client";

// The landing page as a short cartoon you scrub with the scroll wheel. A stage stays
// pinned while the page scrolls; scroll position becomes a time t in 0..1 and every
// shape on stage is a function of t, so scrolling back plays the film backwards.
// Subtitles and figures are HTML over the drawing so they stay sharp, readable and
// selectable. People who ask for less motion get the chapter version (Story) instead.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types";
import { useLang } from "./LangContext";
import { Person, lookFor, type Mood } from "./coach/Showroom";
import Story from "./Story";
import { CHAPTERS, type Figure } from "./story-content";
import {
  ANSWER, BEATS, CONVINCED, ENV_BEATS, ENV_SCENE, FILM_INTRO, MYTH, PHONE_COMMENTS, REAL_QUOTES, SCENES, STATION_SIGN, WORRIES,
} from "./film-content";

const VIEW_KEY = "landing-view";
const VIEW_LABEL = {
  story: { vi: "Đọc dạng chữ", en: "Read as text" },
  film: { vi: "Xem dạng phim", en: "Watch as a film" },
};

// Near-monochrome: blue-grey scenery, colour only where it means something —
// green for electric and clean air, amber for worry, red for the rumour.
const M = ["#f2f5f9", "#dde5ef", "#c6d2e1", "#a9bad0", "#8a9fbb", "#6c84a3", "#4e6585", "#34496a", "#1f2f4a"];
const GREEN = "#0e8a45";

// ---------- the two clocks ----------
// tn is the film's clock (scroll position). The original scenes run on an older clock;
// the air scene was slotted in after the street by holding that clock still.
const OLD_HOLD = 0.235, OLD_RESUME = 0.245;
function toOld(tn: number) {
  if (tn <= ENV_SCENE.a) return (tn / ENV_SCENE.a) * OLD_HOLD;
  if (tn < ENV_SCENE.b) return OLD_HOLD;
  return OLD_RESUME + ((tn - ENV_SCENE.b) / (1 - ENV_SCENE.b)) * (1 - OLD_RESUME);
}
function toNew(t: number) {
  if (t <= OLD_HOLD) return (t / OLD_HOLD) * ENV_SCENE.a;
  return ENV_SCENE.b + ((t - OLD_RESUME) / (1 - OLD_RESUME)) * (1 - ENV_SCENE.b);
}

// ---------- timing helpers ----------
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
/** 1 inside [a, b], fading over f at both ends. */
const win = (t: number, a: number, b: number, f = 0.015) => Math.min(seg(t, a - f, a + f), 1 - seg(t, b - f, b + f));
const wrap = (x: number, w: number) => ((x % w) + w) % w;

function mixHex(a: string, b: string, x: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, x));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
// Sky through the day: dawn, day, storm, clearing, golden hour.
const SKY: [number, string, string][] = [
  [0, "#b9c3cf", "#dfe4ea"], [0.12, "#aebfd3", "#e3e9f0"], [0.43, "#a9c6e8", "#eaf1f9"],
  [0.5, "#4e6585", "#8a9fbb"], [0.62, "#56708f", "#93a8c2"], [0.74, "#a9c6e8", "#eaf1f9"],
  [0.88, "#98bde6", "#e6f0fb"], [1, "#8fb8e6", "#e3eefb"],
];
function skyAt(t: number): [string, string] {
  for (let i = 1; i < SKY.length; i++) {
    if (t <= SKY[i][0]) {
      const [a, top0, bot0] = SKY[i - 1];
      const [b, top1, bot1] = SKY[i];
      const x = ease(seg(t, a, b));
      return [mixHex(top0, top1, x), mixHex(bot0, bot1, x)];
    }
  }
  return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
}

// ---------- the street ----------
const rnd = (i: number, n: number) => { const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return v - Math.floor(v); };
const FACADES = ["#dde5ef", "#c6d2e1", "#e9eef5", "#b8c7da", "#d2dcea", "#a9bad0", "#e3e9f1", "#c0cde0"];
const SHOP_SIGNS = ["Phở", "Cà phê", "Tạp hóa", "Sạc xe điện", "Bánh mì", "Điện thoại"];
const HOUSES = (() => {
  const out: { x: number; w: number; h: number; c: string; sign?: string }[] = [];
  let x = 0, i = 0;
  while (x < 1600) {
    const w = 78 + Math.round(rnd(i, 1) * 40);
    out.push({ x, w, h: 190 + Math.round(rnd(i, 2) * 150), c: FACADES[i % FACADES.length], sign: i % 3 === 1 ? SHOP_SIGNS[(i / 3) % SHOP_SIGNS.length | 0] : undefined });
    x += w; i++;
  }
  return out;
})();
const TOWERS = Array.from({ length: 12 }, (_, i) => ({ x: Math.round(i * 140 + rnd(i, 3) * 40), w: Math.round(70 + rnd(i, 4) * 60), h: Math.round(220 + rnd(i, 5) * 200) }));

// Ten motorbikes and five cars. Exactly 3 bikes (≈32%) and 2 cars (40%) turn electric,
// so the street shows the same shares the subtitles quote.
const BIKES = Array.from({ length: 10 }, (_, i) => ({ base: Math.round(i * 200 + rnd(i, 6) * 60), turn: ({ 2: 0.135, 5: 0.155, 8: 0.175 } as Record<number, number>)[i], c: [M[6], M[5], M[7], M[4], M[6]][i % 5], shirt: [M[3], M[4], M[2], M[5], M[3]][i % 5] }));
const CARS = Array.from({ length: 5 }, (_, i) => ({ base: Math.round(i * 400 + rnd(i, 7) * 80), turn: ({ 1: 0.075, 3: 0.095 } as Record<number, number>)[i], c: [M[5], M[7], M[6], M[4], M[6]][i] }));

const GROUND = 650; // sidewalk feet line
const ROAD_TOP = 668;

function Scooter({ x, y, electric, c, shirt, flash }: { x: number; y: number; electric: boolean; c: string; shirt: string; flash: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {!electric && (
        <g className="puffs">
          <circle cx="-52" cy="-16" r="7" /><circle cx="-64" cy="-22" r="9" /><circle cx="-80" cy="-28" r="11" />
        </g>
      )}
      <circle cx="-28" cy="-12" r="12" fill="#1b2a40" /><circle cx="-28" cy="-12" r="5" fill="#cdd6e2" />
      <circle cx="30" cy="-12" r="12" fill="#1b2a40" /><circle cx="30" cy="-12" r="5" fill="#cdd6e2" />
      <path d="M-40 -14 Q-42 -36 -18 -38 L6 -38 L20 -60 L30 -60 L36 -20 Q38 -12 26 -12 Z" fill={electric ? GREEN : c} />
      <rect x="-28" y="-47" width="32" height="9" rx="4" fill="#1b2a40" />
      <rect x="-16" y="-88" width="20" height="42" rx="9" fill={shirt} />
      <path d="M2 -78 L28 -60" stroke={shirt} strokeWidth="7" strokeLinecap="round" />
      <circle cx="-6" cy="-98" r="12" fill="#f1c7a0" />
      <path d="M-19 -100 Q-18 -116 -6 -116 Q8 -116 7 -100 Z" fill={electric ? "#3be08a" : M[1]} />
      {electric && <path d="M-6 -30 l-5 9 h6 l-4 9" stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="round" />}
      {flash > 0 && <circle cx="0" cy="-50" r={20 + flash * 60} fill="none" stroke="#3be08a" strokeWidth="4" opacity={1 - flash} />}
    </g>
  );
}

function Car({ x, y, electric, c, flash }: { x: number; y: number; electric: boolean; c: string; flash: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {!electric && (
        <g className="puffs">
          <circle cx="-96" cy="-14" r="8" /><circle cx="-110" cy="-20" r="10" /><circle cx="-128" cy="-26" r="12" />
        </g>
      )}
      <path d="M-88 -18 Q-90 -46 -62 -50 L-32 -76 Q-22 -84 0 -84 L36 -84 Q52 -82 64 -62 L80 -50 Q92 -46 90 -18 Z" fill={electric ? "#ffffff" : c} stroke={electric ? GREEN : "none"} strokeWidth="5" />
      <path d="M-26 -72 Q-18 -78 -4 -78 L30 -78 Q42 -76 50 -60 L56 -50 L-48 -50 Z" fill="#cfe6fb" />
      <circle cx="-52" cy="-16" r="17" fill="#1b2a40" /><circle cx="-52" cy="-16" r="7" fill="#cdd6e2" />
      <circle cx="54" cy="-16" r="17" fill="#1b2a40" /><circle cx="54" cy="-16" r="7" fill="#cdd6e2" />
      <rect x="78" y="-40" width="10" height="7" rx="2" fill="#ffc20e" />
      {electric && <path d="M-6 -44 l-7 12 h8 l-5 12" stroke="#0e8a45" strokeWidth="4" fill="none" strokeLinejoin="round" />}
      {flash > 0 && <circle cx="0" cy="-40" r={30 + flash * 90} fill="none" stroke="#3be08a" strokeWidth="5" opacity={1 - flash} />}
    </g>
  );
}

function HeroCar({ x, y, battery, moving, plugged, opacity }: { x: number; y: number; battery: number; moving: boolean; plugged: boolean; opacity: number }) {
  return (
    <svg x={x - 115} y={y - 168} width="230" height="168" viewBox="0 0 170 124" className={`hero-car${moving ? " moving" : ""}`} opacity={opacity} overflow="visible">
      <ellipse cx="86" cy="121" rx="80" ry="5" fill="rgba(0,0,0,.25)" />
      <g className="hc-body">
        <path d="M8 104 C 4 84, 14 72, 34 70 L 56 50 C 62 44, 70 42, 80 42 L 112 42 C 124 42, 132 48, 138 58 L 148 72 C 160 74, 166 82, 166 94 L 166 104 Z" fill="#fff" stroke="#0b4ea2" strokeWidth="4" />
        <path d="M62 54 C 66 50, 70 48, 78 48 L 110 48 C 118 48, 124 52, 128 58 L 136 70 L 52 70 Z" fill="#cfe6fb" />
        <ellipse cx="96" cy="60" rx="7" ry="8" fill="#fff" stroke="#0f1b2d" strokeWidth="1.5" />
        <ellipse cx="116" cy="60" rx="7" ry="8" fill="#fff" stroke="#0f1b2d" strokeWidth="1.5" />
        <circle cx="98" cy="61" r="3.4" fill="#0f1b2d" /><circle cx="118" cy="61" r="3.4" fill="#0f1b2d" />
        <path d="M100 74 q 8 6 16 0" stroke="#0f1b2d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <rect x="150" y="84" width="10" height="6" rx="2" fill="#ffc20e" />
        <rect x="74" y="24" width="40" height="14" rx="3" fill="#0a1626" />
        <rect x="114" y="28" width="4" height="6" rx="1" fill="#0a1626" />
        <rect x="77" y="27" width={34 * clamp(battery, 0.08, 1)} height="8" rx="1.5" fill={battery < 0.3 ? "#f5a524" : "#3be08a"} />
      </g>
      {[44, 132].map((cx) => (
        <g key={cx} className="hc-wheel" style={{ transformOrigin: `${cx}px 106px` }}>
          <circle cx={cx} cy="106" r="15" fill="#1b2a40" /><circle cx={cx} cy="106" r="6" fill="#cdd6e2" />
          <path d={`M${cx} 93v26M${cx - 13} 106h26`} stroke="#cdd6e2" strokeWidth="2.5" />
        </g>
      ))}
    </svg>
  );
}

/** A speech bubble drawn in scene units; HTML inside so the text wraps. */
function Bubble({ x, y, w, text, tone = "plain", opacity = 1, below = false }: { x: number; y: number; w: number; text: string; tone?: "plain" | "worry" | "myth" | "good" | "quote"; opacity?: number; below?: boolean }) {
  if (opacity <= 0.01) return null;
  return (
    <foreignObject x={x - w / 2} y={below ? y : y - 200} width={w} height="200" opacity={opacity} style={{ overflow: "visible" }}>
      <div className={`fb-wrap${below ? " below" : ""}`}>
        <div className={`fb fb-${tone}`} style={{ transform: `scale(${0.85 + 0.15 * Math.min(1, opacity * 1.4)})` }}>{text}</div>
      </div>
    </foreignObject>
  );
}


function Phone({ t, lang, zoom, vis }: { t: number; lang: Lang; zoom: number; vis: number }) {
  if (vis <= 0.01) return null;
  const s = lerp(0.09, 1.08, zoom);
  const cx = lerp(786, 920, zoom), cy = lerp(566, 470, zoom);
  const shown = PHONE_COMMENTS.map((_, i) => seg(t, 0.30 + i * 0.018, 0.312 + i * 0.018));
  const count = shown.reduce((a, b) => a + b, 0);
  const shift = Math.max(0, count - 4) * 66;
  const avatars = ["#f5a524", "#0e6f77", "#e0576f", "#7c5cd6", "#0b4ea2", "#c2410c"];
  return (
    <g opacity={vis}>
      <rect width="1600" height="1000" fill="#0f1b2d" opacity={0.6 * zoom} />
      <Person look={monoLook("sinh-vien", 2)} mood="neutral" className="film-person" x={760} y={GROUND - 160} width="80" height="160" opacity={1 - zoom} />
      <g transform={`translate(${cx} ${cy}) scale(${s})`}>
        <rect x="-180" y="-320" width="360" height="640" rx="44" fill="#0f1b2d" />
        <g clipPath="url(#fscreen)">
          <rect x="-166" y="-306" width="332" height="612" fill="#fff" />
          <rect x="-166" y="-306" width="332" height="190" fill="#9fd2ff" />
          <circle cx="110" cy="-262" r="22" fill="#ffd95a" />
          <rect x="-166" y="-172" width="332" height="56" fill="#3a4a60" />
          <line x1="-166" y1="-144" x2="166" y2="-144" stroke="#ffc20e" strokeWidth="3" strokeDasharray="18 14" strokeDashoffset={t * 900} />
          <g transform={`translate(${lerp(-170, 70, seg(t, 0.28, 0.42))} -246) scale(.62)`}>
            <path d="M8 104 C 4 84, 14 72, 34 70 L 56 50 C 62 44, 70 42, 80 42 L 112 42 C 124 42, 132 48, 138 58 L 148 72 C 160 74, 166 82, 166 94 L 166 104 Z" fill="#fff" stroke="#0b4ea2" strokeWidth="5" />
            <path d="M62 54 C 66 50, 70 48, 78 48 L 110 48 C 118 48, 124 52, 128 58 L 136 70 L 52 70 Z" fill="#cfe6fb" />
            <circle cx="44" cy="106" r="15" fill="#1b2a40" /><circle cx="132" cy="106" r="15" fill="#1b2a40" />
          </g>
          <rect x="-166" y="-116" width="332" height="5" fill="#e3e9f1" />
          <rect x="-166" y="-116" width={332 * seg(t, 0.27, 0.43)} height="5" fill="#e0362c" />
          <text x="-148" y="-80" fontSize="19" fontWeight="700" fill="#0f1b2d" fontFamily="Barlow, sans-serif">{lang === "vi" ? "SUV điện mới — đặt lịch lái thử" : "New electric SUV — book a test drive"}</text>
          <text x="-148" y="-56" fontSize="14" fill="#56667c" fontFamily="Barlow, sans-serif">{lang === "vi" ? "Được tài trợ" : "Sponsored"}</text>
          <rect x="-166" y="-42" width="332" height="1.5" fill="#e3e9f1" />
          <text x="-148" y="-16" fontSize="15" fontWeight="700" fill="#3a4a60" fontFamily="Barlow, sans-serif">{lang === "vi" ? "Bình luận" : "Comments"}</text>
          <g clipPath="url(#fcomments)"><g transform={`translate(0 ${-shift})`}>
            {PHONE_COMMENTS.map((c, i) => (
              <g key={i} opacity={shown[i]} transform={`translate(0 ${(1 - shown[i]) * 14})`}>
                <circle cx="-138" cy={26 + i * 66} r="16" fill={avatars[i]} />
                <foreignObject x="-114" y={4 + i * 66} width="270" height="62">
                  <div className="fc">{c[lang]}</div>
                </foreignObject>
              </g>
            ))}
          </g></g>
        </g>
        <rect x="-50" y="-312" width="100" height="16" rx="8" fill="#0f1b2d" />
      </g>
    </g>
  );
}

const MONO_SHIRTS = [M[3], M[5], M[2], M[4], M[6]];
const monoLook = (id: string, i: number) => ({ ...lookFor(id, i), shirt: MONO_SHIRTS[i % MONO_SHIRTS.length], pants: M[7] });

// ---------- the stage ----------
// Where the camera looks on a narrow, upright screen (scene x in 0..1600), by the old clock.
// Wide screens see the whole street; phones see a slice of it, so the slice follows the action.
const FOCUS: [number, number][] = [
  [0, 650], [0.245, 650], [0.262, 900], [0.44, 900], [0.46, 820], [0.645, 820], [0.66, 760],
  [0.742, 760], [0.772, 430], [0.835, 560], [0.865, 940], [1, 940],
];
function focusAt(t: number) {
  for (let i = 1; i < FOCUS.length; i++) {
    if (t <= FOCUS[i][0]) return lerp(FOCUS[i - 1][1], FOCUS[i][1], ease(seg(t, FOCUS[i - 1][0], FOCUS[i][0])));
  }
  return FOCUS[FOCUS.length - 1][1];
}

function Scene({ t, tn, lang, fit, calm, upright, aspect }: { t: number; tn: number; lang: Lang; fit: "slice" | "meet"; calm: boolean; upright: boolean; aspect: number }) {
  // Narrow screens: show a window of the scene as tall as the stage, centred on the action.
  const viewW = aspect < 1 ? Math.max(420, 1000 * aspect) : 1600;
  const viewX = aspect < 1 ? clamp(focusAt(t) - viewW / 2, 0, 1600 - viewW) : 0;
  // calm (reduced motion): the camera never pans; scenes still change, by fading.
  const envP = seg(tn, ENV_SCENE.a, ENV_SCENE.b);
  const cam = calm ? 0 : (t < 0.9 ? t * 5200 : 0.9 * 5200 + (t - 0.9) * 600) + envP * 900;
  // Haze over the city: thins a little as the street electrifies, then clears in the air scene.
  const haze = (0.4 - 0.08 * seg(t, 0.075, 0.175)) * (1 - 0.8 * ease(seg(tn, 0.285, 0.335)));
  const trees = ease(seg(tn, 0.30, 0.345));
  const [skyTop, skyBot] = skyAt(t);

  // scene visibilities
  const v1 = 1 - seg(t, 0.25, 0.285);
  const vPhone = win(t, 0.25, 0.455, 0.01);
  const zoom = ease(seg(t, 0.255, 0.30)) * (1 - ease(seg(t, 0.425, 0.455)));
  const rain = win(t, 0.445, 0.635, 0.02);
  const water = ease(seg(t, 0.47, 0.56)) * (1 - ease(seg(t, 0.62, 0.67)));
  const vRainPeople = win(t, 0.452, 0.64, 0.01);
  const vCrowd = win(t, 0.648, 0.845, 0.01);
  const vStation = seg(t, 0.835, 0.86);
  const sunUp = 1 - seg(t, 0.0, 0.12);

  // hero car
  const heroHidden = Math.max(win(t, 0.27, 0.44, 0.012), win(t, 0.655, 0.83, 0.012));
  // On an upright screen the sides are cropped, so the station stops closer.
  const stationX = lerp(1780, upright ? 1020 : 1180, ease(seg(t, 0.84, 0.9)));
  const heroX = lerp(560, stationX - 250, ease(seg(t, 0.885, 0.93)));
  const plugged = t > 0.932;
  const battery = plugged ? lerp(0.22, 1, seg(t, 0.932, 0.99)) : lerp(0.9, 0.22, seg(t, 0.05, 0.9));

  return (
    <svg className="film-svg" viewBox={`${viewX.toFixed(1)} 0 ${viewW.toFixed(1)} 1000`} preserveAspectRatio={`xMidYMid ${fit}`} aria-hidden="true">
      <defs>
        <linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={skyTop} /><stop offset="1" stopColor={skyBot} /></linearGradient>
        <pattern id="frain" width="40" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
          <line x1="20" y1="0" x2="20" y2="34" stroke="#dbe7f5" strokeWidth="2.5" strokeLinecap="round" />
        </pattern>
        <clipPath id="fscreen"><rect x="-166" y="-306" width="332" height="612" rx="30" /></clipPath>
        <clipPath id="fcomments"><rect x="-166" y="-4" width="332" height="310" /></clipPath>
      </defs>

      {/* sky, sun, clouds */}
      <rect width="1600" height="1000" fill="url(#fsky)" />
      <g opacity={1 - rain}>
        <circle cx={1300} cy={lerp(260, 120, 1 - sunUp)} r="58" fill="#ffffff" opacity=".9" />
        <circle cx={1300} cy={lerp(260, 120, 1 - sunUp)} r="84" fill="#ffffff" opacity=".3" />
      </g>
      <g transform={`translate(${-wrap(cam * 0.05, 1800)} 0)`} fill={rain > 0.3 ? M[4] : M[0]} className="clouds-layer">
        {[0, 1800].map((o) => (
          <g key={o} transform={`translate(${o} 0)`}>
            <ellipse cx="220" cy="120" rx="90" ry="28" /><circle cx="196" cy="104" r="34" /><circle cx="246" cy="98" r="28" />
            <ellipse cx="900" cy="80" rx="70" ry="22" /><circle cx="884" cy="68" r="26" />
            <ellipse cx="1500" cy="150" rx="80" ry="24" /><circle cx="1480" cy="134" r="30" />
          </g>
        ))}
      </g>
      {/* storm clouds roll in */}
      <g opacity={rain} fill={M[6]}>
        <ellipse cx="300" cy="60" rx="320" ry="90" /><ellipse cx="900" cy="40" rx="380" ry="100" /><ellipse cx="1450" cy="70" rx="300" ry="90" />
      </g>

      {/* far towers */}
      <g transform={`translate(${-wrap(cam * 0.12, 1680)} 0)`} fill={M[3]} opacity=".75">
        {[0, 1680].map((o) => (
          <g key={o} transform={`translate(${o} 0)`}>
            {TOWERS.map((b, i) => <rect key={i} x={b.x} y={GROUND - 60 - b.h} width={b.w} height={b.h + 60} rx="3" />)}
          </g>
        ))}
      </g>

      {/* tube houses, signs and power lines */}
      <g transform={`translate(${-wrap(cam * 0.5, 1600)} 0)`}>
        {[0, 1600].map((o) => (
          <g key={o} transform={`translate(${o} 0)`}>
            {HOUSES.map((h, i) => (
              <g key={i}>
                <rect x={h.x} y={GROUND - h.h} width={h.w - 2} height={h.h} fill={h.c} stroke="rgba(15,27,45,.15)" />
                {Array.from({ length: Math.floor((h.h - 90) / 62) }, (_, f) => (
                  <g key={f}>
                    <rect x={h.x + 14} y={GROUND - h.h + 18 + f * 62} width={h.w - 30} height="30" rx="3" fill={M[0]} stroke="rgba(15,27,45,.15)" />
                    <rect x={h.x + 8} y={GROUND - h.h + 50 + f * 62} width={h.w - 18} height="5" fill="rgba(15,27,45,.35)" />
                  </g>
                ))}
                <rect x={h.x + 6} y={GROUND - 70} width={h.w - 14} height="70" fill={M[6]} opacity=".8" />
                <path d={`M${h.x + 2} ${GROUND - 78} h${h.w - 6} l-8 14 h${-(h.w - 22)} Z`} fill={i % 2 ? M[5] : M[7]} />
                {h.sign && (
                  <g>
                    <rect x={h.x + 8} y={GROUND - 104} width={h.w - 18} height="22" rx="3" fill={h.sign === "Sạc xe điện" ? GREEN : M[0]} stroke="rgba(15,27,45,.3)" />
                    <text x={h.x + h.w / 2 - 2} y={GROUND - 88} textAnchor="middle" fontSize="13" fontWeight="700" fill={h.sign === "Sạc xe điện" ? "#fff" : M[7]} fontFamily="Barlow Semi Condensed, Barlow, sans-serif">{h.sign}</text>
                  </g>
                )}
              </g>
            ))}
            {[120, 520, 920, 1320].map((px) => <rect key={px} x={px} y={GROUND - 300} width="8" height="300" fill={M[6]} />)}
            {[0, 1, 2].map((k) => (
              <path key={k} d={`M-280 ${GROUND - 290 + k * 9} Q-80 ${GROUND - 230 + k * 14} 124 ${GROUND - 290 + k * 9} Q324 ${GROUND - 225 + k * 12} 524 ${GROUND - 290 + k * 9} Q724 ${GROUND - 232 + k * 10} 924 ${GROUND - 290 + k * 9} Q1124 ${GROUND - 228 + k * 13} 1324 ${GROUND - 290 + k * 9} Q1524 ${GROUND - 232 + k * 11} 1724 ${GROUND - 290 + k * 9}`} stroke={M[7]} strokeWidth="2" fill="none" opacity=".6" />
            ))}
          </g>
        ))}
      </g>

      {/* haze over the city */}
      <rect x="0" y="0" width="1600" height={GROUND + 10} fill="#8e9399" opacity={haze} />

      {/* trees that grow along the pavement in the air scene, and stay */}
      {trees > 0 && (
        <g transform={`translate(${-wrap(cam * 0.5, 1600)} 0)`}>
          {[0, 1600].map((o) => (
            <g key={o} transform={`translate(${o} 0)`}>
              {[60, 460, 860, 1260].map((x) => (
                <g key={x} transform={`translate(${x} ${GROUND + 4}) scale(${trees})`}>
                  <rect x="-6" y="-70" width="12" height="70" rx="4" fill={M[7]} />
                  <circle cx="0" cy="-96" r="40" fill={GREEN} />
                  <circle cx="-26" cy="-76" r="26" fill="#0a6b35" />
                  <circle cx="26" cy="-80" r="28" fill="#1aa35a" />
                </g>
              ))}
            </g>
          ))}
        </g>
      )}

      {/* sidewalk and road */}
      <rect x="0" y={GROUND - 8} width="1600" height="26" fill={M[2]} />
      <rect x="0" y={ROAD_TOP} width="1600" height={1000 - ROAD_TOP} fill={M[7]} />
      <line x1="-200" y1="790" x2="1800" y2="790" stroke={M[2]} strokeWidth="6" strokeDasharray="60 50" strokeDashoffset={cam % 110} />
      <rect x="0" y={ROAD_TOP} width="1600" height="6" fill={M[3]} />

      {/* scene 1: traffic switching to electric */}
      <g opacity={v1}>
        {CARS.map((c, i) => {
          const x = wrap(c.base - cam * 0.32, 2100) - 200;
          const electric = c.turn !== undefined && t >= c.turn;
          const flash = c.turn !== undefined ? seg(t, c.turn, c.turn + 0.012) * (t < c.turn + 0.012 ? 1 : 0) : 0;
          return <Car key={i} x={x} y={748} electric={electric} c={c.c} flash={flash} />;
        })}
        {BIKES.map((b, i) => {
          const x = wrap(b.base - cam * 0.45, 2100) - 150;
          const electric = b.turn !== undefined && t >= b.turn;
          const flash = b.turn !== undefined ? seg(t, b.turn, b.turn + 0.012) * (t < b.turn + 0.012 ? 1 : 0) : 0;
          return <Scooter key={i} x={x} y={808} electric={electric} c={b.c} shirt={b.shirt} flash={flash} />;
        })}
      </g>

      {/* scene 3: people waiting in the rain */}
      <g opacity={vRainPeople}>
        {["tinh-toan", "lo-ngap", "sinh-vien"].map((id, i) => {
          const x = 640 + i * 210;
          return (
            <g key={id}>
              <Person look={monoLook(id, i)} mood="worried" className="film-person" x={x - 40} y={GROUND - 156} width="80" height="160" />
              <Bubble x={x} y={GROUND - 160 - (i % 2) * 70} w={230} tone="worry" text={WORRIES[i][lang]} opacity={win(t, 0.465 + i * 0.02, 0.545, 0.008)} />
              <Bubble x={x} y={GROUND - 160 - (i % 2) * 90} w={300} tone="quote" text={`“${REAL_QUOTES[i]}”`} opacity={win(t, 0.552 + i * 0.022, 0.64, 0.008)} />
            </g>
          );
        })}
      </g>

      {/* the hero car */}
      <HeroCar x={heroX} y={866 - water * 18} battery={battery} moving={t < 0.93} plugged={plugged} opacity={1 - heroHidden} />

      {/* flood water and rain over everything in the street */}
      {water > 0 && (
        <g opacity={0.82}>
          <path d={`M0 ${880 - water * 140} q 50 -12 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 t 100 0 V1000 H0 Z`} fill={M[5]} className="water" />
          {t < 0.93 && <g className="splash" opacity={water}><circle cx="470" cy={870 - water * 140} r="10" fill="#dbe7f5" /><circle cx="450" cy={858 - water * 140} r="7" fill="#dbe7f5" /><circle cx="680" cy={866 - water * 140} r="8" fill="#dbe7f5" /></g>}
        </g>
      )}
      <g opacity={rain * 0.85} className="rain-layer"><rect x="-200" y="-900" width="2000" height="2800" fill="url(#frain)" className="rain-fall" /></g>

      {/* scene 4: the rumour spreads, then an answer turns it */}
      <g opacity={vCrowd}>
        {Array.from({ length: 8 }, (_, i) => {
          const x = 300 + i * 150;
          const feet = i % 2 ? 760 : 690;
          const origin = 3;
          const spreadRank = Math.abs(i - origin);
          const infected = seg(t, 0.655, 0.735) * 8 > spreadRank;
          const converted = seg(t, 0.775, 0.83) * 8 > i;
          const mood: Mood = converted ? "happy" : infected ? "worried" : "neutral";
          const ids = ["tinh-toan", "lo-ngap", "sinh-vien", "a", "b"];
          return (
            <g key={i}>
              <Person look={monoLook(ids[i % 5], i)} mood={mood} className="film-person" x={x - 36} y={feet - 146} width="72" height="146" />
              {infected && !converted && (
                <Bubble x={x} y={feet - 150} w={i === origin ? 250 : 150} tone="myth" text={i === origin ? MYTH[lang] : (lang === "vi" ? "Dễ cháy à?" : "Fire risk?")} opacity={1} />
              )}
              {converted && <Bubble x={x} y={feet - 150} w={150} tone="good" text={CONVINCED[lang]} opacity={1} />}
            </g>
          );
        })}
        {(() => {
          const sx = lerp(-80, 150, ease(seg(t, 0.745, 0.772)));
          return (
            <g>
              <Person look={{ shirt: "#0e8a45", pants: "#0f1b2d", skin: "#f0c39c", hair: "#1d1a17", style: "neat", prop: "badge" }} mood="happy" className="film-person" x={sx - 40} y={846 - 160} width="80" height="160" />
              <Bubble x={sx + 120} y={700} w={300} tone="good" text={ANSWER[lang]} opacity={seg(t, 0.765, 0.775)} />
            </g>
          );
        })()}
      </g>

      {/* scene 5: the charging stop */}
      <g opacity={vStation} transform={`translate(${stationX} 0)`}>
        <rect x="-20" y={GROUND - 300} width="190" height="64" rx="10" fill="#0b4ea2" />
        <rect x="-14" y={GROUND - 294} width="178" height="52" rx="7" fill="none" stroke="#fff" strokeWidth="2.5" />
        <foreignObject x="-14" y={GROUND - 294} width="178" height="52">
          <div className="station-sign">{STATION_SIGN[lang]}</div>
        </foreignObject>
        <rect x="60" y={GROUND - 236} width="10" height="40" fill="#5d6d7e" />
        <rect x="20" y={GROUND - 196} width="100" height="196" rx="14" fill="#0b4ea2" />
        <rect x="32" y={GROUND - 182} width="76" height="56" rx="6" fill="#0a1626" />
        <text x="70" y={GROUND - 145} textAnchor="middle" fontSize="26" fontWeight="800" fill="#3be08a" fontFamily="Barlow Semi Condensed, Barlow, sans-serif">
          {Math.round(battery * 100)}%
        </text>
        <circle cx="70" cy={GROUND - 90} r="12" fill={plugged ? "#3be08a" : "#0a1626"} />
      </g>

      {plugged && (
        <path d={`M${heroX + 100} ${866 - 70} C ${heroX + 170} ${866 - 40}, ${stationX} ${GROUND - 40}, ${stationX + 58} ${GROUND - 90}`} stroke="#0f1b2d" strokeWidth="6" fill="none" strokeLinecap="round" />
      )}

      {/* scene 2: into the phone */}
      <Phone t={t} lang={lang} zoom={zoom} vis={vPhone} />
    </svg>
  );
}

// ---------- overlay ----------
function fmt(n: number, decimals: number, lang: Lang) {
  return n.toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function FigureBoard({ f, k, lang }: { f: Figure; k: number; lang: Lang }) {
  return (
    <div className="ff">
      <div className="ff-num">{f.prefix?.[lang]}{fmt(f.value * k, f.decimals ?? 0, lang)}{f.unit && <small>{f.unit[lang]}</small>}</div>
      <div className="ff-label">{f.label[lang]}</div>
      {f.source.url.startsWith("/")
        ? <Link className="ff-src" href={f.source.url}>{f.source.name[lang]}</Link>
        : <a className="ff-src" href={f.source.url} target="_blank" rel="noreferrer">{f.source.name[lang]}</a>}
    </div>
  );
}

export default function Film() {
  const { lang } = useLang();
  const filmRef = useRef<HTMLDivElement>(null);
  const [tn, setT] = useState(0);
  const t = toOld(tn);
  const [mode, setMode] = useState<"film" | "story">("film");
  const [calm, setCalm] = useState(false);
  const [canFilm, setCanFilm] = useState(true);
  function choose(m: "film" | "story") {
    setMode(m);
    try { window.localStorage.setItem(VIEW_KEY, m); } catch { /* not remembered, still switches */ }
  }
  // Fill the frame on wide screens (a little sky and road get cropped); letterbox on tall ones.
  const [fit, setFit] = useState<"slice" | "meet">("slice");
  const [upright, setUpright] = useState(false);
  const [aspect, setAspect] = useState(1.6);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCalm(reduce);
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(VIEW_KEY); } catch { /* storage blocked: use the default */ }
    // Phones get the chapter version: at that width the scene's speech bubbles would be
    // too small to read, and the chapters were laid out for a narrow screen anyway.
    // Reduced motion no longer drops the film: it plays calm instead (see Scene).
    // Only very short screens (a phone held sideways) get the text version by default now;
    // upright phones play the film with the camera following the action.
    const small = window.innerHeight < 460;
    setCanFilm(!small);
    if (saved === "story" || (small && saved !== "film")) setMode("story");
    const nav = document.querySelector<HTMLElement>(".nav");
    if (nav) filmRef.current?.style.setProperty("--nav-h", `${nav.offsetHeight}px`);
  }, []);

  useEffect(() => {
    if (mode !== "film") return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = filmRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const stage = el.querySelector<HTMLElement>(".film-stage");
      const span = r.height - (stage?.offsetHeight ?? window.innerHeight);
      setT(clamp(-r.top / Math.max(1, span)));
      // Always fill the frame. On tall screens (tablets held upright) this crops the sides
      // a little, which keeps people and speech bubbles big enough to read.
      if (stage) { setFit("slice"); setUpright(stage.offsetWidth < stage.offsetHeight); setAspect(stage.offsetWidth / stage.offsetHeight); }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [mode]);

  if (mode === "story") {
    return <Story onSwitch={canFilm ? () => choose("film") : undefined} switchLabel={VIEW_LABEL.film[lang]} />;
  }

  function seek(to: number) {
    const el = filmRef.current;
    const stage = el?.querySelector<HTMLElement>(".film-stage");
    if (!el || !stage) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + to * (el.offsetHeight - stage.offsetHeight) + 2, behavior: "smooth" });
  }

  const inEnv = tn >= ENV_SCENE.a && tn < ENV_SCENE.b;
  const bt = inEnv ? tn : t; // beats are timed on the clock of their own scene
  const beat = (inEnv ? ENV_BEATS : BEATS).find((b) => bt >= b.a && bt < b.b);
  const beatVis = beat ? win(bt, beat.a, beat.b, 0.008) : 0;
  const k = beat ? ease(seg(bt, beat.a, beat.a + (beat.b - beat.a) * 0.45)) : 0;
  const intro = 1 - seg(t, 0.015, 0.05);
  const exits = seg(t, 0.935, 0.965);
  const timeline = [
    { at: toNew(SCENES[0].at), label: SCENES[0].label },
    { at: ENV_SCENE.a + 0.004, label: ENV_SCENE.label },
    ...SCENES.slice(1).map((s) => ({ at: toNew(s.at), label: s.label })),
  ];
  const sceneIdx = timeline.reduce((acc, s, i) => (tn >= s.at - 0.001 ? i : acc), 0);
  const built = CHAPTERS.find((c) => c.id === "built");

  return (
    <div className="film" ref={filmRef}>
      <div className={`film-stage${exits > 0.01 ? " has-exits" : ""}`} style={{ background: `linear-gradient(${skyAt(t)[0]} 0 50%, ${M[7]} 50%)` }}>
        <Scene t={t} tn={tn} lang={lang} fit={fit} calm={calm} upright={upright} aspect={aspect} />

        <button type="button" className="film-switch" onClick={() => choose("story")}>{VIEW_LABEL.story[lang]}</button>

        {/* scrubber: the film's timeline, with the five scenes */}
        <div className="film-bar" aria-hidden="true">
          <div className="film-bar-track"><i style={{ width: `${tn * 100}%` }} /></div>
          <div className="film-bar-scenes">
            {timeline.map((s, i) => (
              <button key={i} tabIndex={-1} className={i === sceneIdx && tn > 0.03 ? "on" : ""} style={{ left: `${s.at * 100}%` }} onClick={() => seek(s.at + 0.012)}>
                {s.label[lang]}
              </button>
            ))}
          </div>
        </div>

        {intro > 0.01 && (
          <div className="film-intro" style={{ opacity: intro, transform: `translateY(${(1 - intro) * -30}px)` }}>
            <h1>{FILM_INTRO.title[lang]}</h1>
            <span className="film-cue"><i />{FILM_INTRO.cue[lang]}</span>
          </div>
        )}

        {beat?.figs && beatVis > 0.02 && (
          <div className={`film-figs n${beat.figs.length}${beat.tone ? ` tone-${beat.tone}` : ""}`} style={{ opacity: beatVis }}>
            {beat.figs.map((f, i) => <FigureBoard key={i} f={f} k={k} lang={lang} />)}
          </div>
        )}

        {beat && (
          <p className="film-sub" style={{ opacity: beatVis }} aria-hidden="true">{beat.text[lang]}</p>
        )}

        {exits > 0.01 && built?.exits && (
          <nav className="film-exits" style={{ opacity: exits, transform: `translateY(${(1 - exits) * 24}px)` }} aria-label={built.title[lang]}>
            {built.exits.map((x) => (
              <Link key={x.href} href={x.href} className="exit">
                <span className="exit-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 19 19 5M9 5h10v10" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span className="exit-text"><strong>{x.label[lang]}</strong><span>{x.sub[lang]}</span></span>
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* The whole script as text, for screen readers and for anyone who wants to read it. */}
      <ol className="sr-only">
        {[...BEATS.slice(0, 3), ...ENV_BEATS, ...BEATS.slice(3)].map((b, i) => (
          <li key={i}>
            {b.text[lang]}
            {b.figs?.map((f, j) => <span key={j}> {f.prefix?.[lang]}{fmt(f.value, f.decimals ?? 0, lang)}{f.unit?.[lang]} {f.label[lang]} ({f.source.name[lang]}).</span>)}
          </li>
        ))}
      </ol>
    </div>
  );
}

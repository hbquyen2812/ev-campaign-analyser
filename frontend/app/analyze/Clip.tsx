"use client";

// Video attached to a post. The post's words are analysed by the model as usual; the
// video is measured in the browser (never uploaded, no model) and shown with the words
// the way people will meet it: under the text like a Facebook post, or full-screen with
// the text on top like TikTok/Reels.

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { videoAdvice, type VideoReport } from "@/lib/video-probe";

export const SAMPLE_VIDEO = "/samples/ev-sample.webm";
export type ClipStyle = "post" | "tiktok";

export const handle = (title: string) =>
  "@" + (title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 22) || "thuonghieu_xedien");

const ICON = {
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  chat: "M4 5h16v11H9l-5 4V5Z",
  share: "M14 4l6 6-6 6M20 10H9a5 5 0 0 0-5 5v4",
};
const Ico = ({ d, size = 26 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** The video with tap-to-play and a progress line, used by both styles. */
function Player({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pct, setPct] = useState(0);
  const toggle = () => { const v = ref.current; if (!v) return; if (v.paused) void v.play(); else v.pause(); };
  return (
    <div className={`clip-player ${className ?? ""}`}>
      <video
        ref={ref} className="clip-video" src={src} muted playsInline loop onClick={toggle}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => { const v = e.currentTarget; setPct(v.duration ? v.currentTime / v.duration : 0); }}
      />
      {!playing && (
        <button type="button" className="clip-play" onClick={toggle} aria-label="Play">
          <svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
        </button>
      )}
      <div className="clip-bar" aria-hidden="true"><i style={{ width: `${pct * 100}%` }} /></div>
    </div>
  );
}

/** Facebook-style: goes under the text inside the phone. */
export function PostMedia({ src }: { src: string }) {
  return <div className="post-media"><Player src={src} /></div>;
}

/** TikTok/Reels-style: fills the phone, text on top. Tapping the text goes back to editing. */
export function TikTokView({ src, caption, account, onEdit }: { src: string; caption: string; account: string; onEdit: () => void }) {
  const { lang } = useT();
  const vi = lang === "vi";
  const who = handle(account);
  return (
    <div className="tt">
      <Player src={src} className="tt-player" />
      <div className="tt-rail" aria-hidden="true">
        <span className="tt-avatar"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" /></svg></span>
        <span><Ico d={ICON.heart} /></span>
        <span><Ico d={ICON.chat} /></span>
        <span><Ico d={ICON.share} /></span>
      </div>
      <button type="button" className="tt-cap" onClick={onEdit} title={vi ? "Bấm để sửa chữ" : "Tap to edit the text"}>
        <strong>{who}</strong>
        <p>{caption || (vi ? "Bấm vào đây để viết chữ cho clip…" : "Tap here to write the clip's text…")}</p>
        <span className="tt-sound">♪ {vi ? "Âm thanh gốc" : "Original sound"} · {who}</span>
      </button>
    </div>
  );
}

/** Thumbnails with cut marks; a scan line while the frames are being measured. */
export function ClipStrip({ report, busy, progress }: { report: VideoReport | null; busy: boolean; progress: number }) {
  if (!busy && !report) return null;
  return (
    <div className="vstrip" aria-hidden="true">
      <div className="vstrip-frames">
        {report?.thumbs.map((th) => <img key={th.t} src={th.src} alt="" />)}
        {busy && !report && Array.from({ length: 8 }, (_, i) => <i key={i} />)}
      </div>
      {report?.cuts.map((c) => <b key={c} className="vstrip-cut" style={{ left: `${(c / report.duration) * 100}%` }} />)}
      {busy && <span className="vstrip-scan" style={{ left: `${progress * 100}%` }} />}
    </div>
  );
}

function fmtTime(s: number, vi: boolean) {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m ? `${m}:${String(r).padStart(2, "0")}` : vi ? `${r} giây` : `${r} s`;
}

/** Result card for the video part of the post. */
export function VideoCard({ report, busy, progress, error, name }: { report: VideoReport | null; busy: boolean; progress: number; error: string | null; name: string }) {
  const { lang } = useT();
  const vi = lang === "vi";
  const advice = report ? videoAdvice(report, lang) : null;
  const orient = report ? (report.orientation === "vertical" ? (vi ? "Dọc" : "Vertical") : report.orientation === "horizontal" ? (vi ? "Ngang" : "Horizontal") : (vi ? "Vuông" : "Square")) : "";
  return (
    <section className="card vcard">
      <div className="section-title">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 6h11v12H4zM15 10l5-3v10l-5-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
        {vi ? "Phần video" : "The video"} <span className="vname">{name}</span>
      </div>
      {error && <div className="error">{error}</div>}
      {busy && (
        <div className="vbusy" role="status"><span className="spinner" />{vi ? `Đang xem từng khung hình… ${Math.round(progress * 100)}%` : `Going through the frames… ${Math.round(progress * 100)}%`}</div>
      )}
      {report && advice && (
        <div className="vcard-grid">
          <div className="vfacts">
            <div><span>{vi ? "Thời lượng" : "Length"}</span><strong>{fmtTime(report.duration, vi)}</strong></div>
            <div><span>{vi ? "Khung hình" : "Frame"}</span><strong>{orient}</strong></div>
            <div><span>{vi ? "Độ phân giải" : "Resolution"}</span><strong>{report.width}×{report.height}</strong></div>
            <div><span>{vi ? "Chuyển cảnh" : "Scene changes"}</span><strong>{report.cuts.length}</strong><em>{vi ? `${report.cutsPer10s.toFixed(1)} lần / 10 giây` : `${report.cutsPer10s.toFixed(1)} per 10 s`}</em></div>
            <div><span>{vi ? "3 giây đầu" : "First 3 s"}</span><strong>{report.openingMotion >= 0.25 || report.cuts.some((c) => c <= 3) ? (vi ? "Có" : "Yes") : (vi ? "Ít" : "Little")}</strong><em>{vi ? "chuyển động" : "movement"}</em></div>
            <div><span>{vi ? "Độ sáng" : "Brightness"}</span><strong>{Math.round(report.brightness * 100)}%</strong></div>
          </div>
          <div>
            <div className="vsub first">{vi ? "Hợp để đăng lên" : "Suits"}</div>
            <div className="vfits">
              {advice.fits.length ? advice.fits.map((f) => <span key={f.key} className="vfit"><strong>{f.label}</strong>{f.why}</span>)
                : <span className="vfit none">{vi ? "Chưa hợp hẳn nền tảng nào theo độ dài và khung hình." : "Doesn't clearly suit a platform by length and frame."}</span>}
            </div>
            <div className="vsub">{vi ? "Nên thử" : "Worth trying"}</div>
            <ul className="vtips">{advice.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
          </div>
        </div>
      )}
      {report && (
        <p className="vnote">
          {vi
            ? "Phần video đang thử nghiệm: các con số được đo trực tiếp từ video trên máy bạn, gợi ý dựa trên vài quy tắc đơn giản, chưa dùng mô hình. Phần chữ ở trên mới được chấm bằng mô hình."
            : "The video part is in beta: the numbers are measured from the video on your device and the suggestions come from simple rules, not a model. The words above are what the model scores."}
        </p>
      )}
    </section>
  );
}

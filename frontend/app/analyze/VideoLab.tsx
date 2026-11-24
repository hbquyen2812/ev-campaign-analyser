"use client";

// "Video" mode of the analyse page. The clip is shown the way people will meet it — a
// TikTok/Reels-style vertical post or a Facebook feed post — with its caption on it.
// The video itself is measured in the browser (never uploaded, no model); the caption
// can be scored on the three networks by the real model.

import { useEffect, useRef, useState } from "react";
import { predictBatch } from "@/lib/api";
import { DECISION_THRESHOLD } from "@/lib/config";
import { useT } from "@/lib/i18n";
import type { Prediction, PredictionModel, Source } from "@/lib/types";
import { probeVideo, videoAdvice, type VideoReport } from "@/lib/video-probe";
import { ChargeCells } from "../components";

const SAMPLE = "/samples/ev-sample.webm";
type Net = "youtube" | "x" | "reddit";
const NETS: { key: Net; name: string }[] = [
  { key: "youtube", name: "YouTube" },
  { key: "x", name: "X" },
  { key: "reddit", name: "Reddit" },
];

function fmtTime(s: number, vi: boolean) {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m ? `${m}:${String(r).padStart(2, "0")}` : vi ? `${r} giây` : `${r} s`;
}
const handle = (title: string) =>
  "@" + (title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 22) || "thuonghieu_xedien");

interface Props {
  caption: string;
  setCaption: (v: string) => void;
  account: string;
  audiences: Record<Net, number | null>;
  apiModel: PredictionModel;
}

export default function VideoLab({ caption, setCaption, account, audiences, apiModel }: Props) {
  const { lang } = useT();
  const vi = lang === "vi";
  const [src, setSrc] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<VideoReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [style, setStyle] = useState<"tiktok" | "facebook">("tiktok");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scores, setScores] = useState<Record<Net, Prediction> | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreErr, setScoreErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const objUrl = useRef<string | null>(null);

  useEffect(() => () => { if (objUrl.current) URL.revokeObjectURL(objUrl.current); }, []);
  // A changed caption makes old caption scores stale.
  useEffect(() => { setScores(null); }, [caption]);

  async function run(url: string, label: string, sampleCaption?: string) {
    setSrc(url); setName(label); setReport(null); setError(null); setProgress(0); setBusy(true); setTime(0); setPlaying(false);
    if (sampleCaption && !caption.trim()) setCaption(sampleCaption);
    try {
      setReport(await probeVideo(url, setProgress));
    } catch {
      setError(vi ? "Không đọc được video này. Thử file .mp4 hoặc .webm khác." : "Couldn't read this video. Try another .mp4 or .webm file.");
    } finally {
      setBusy(false);
    }
  }

  function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) { setError(vi ? "File này không phải video." : "That file isn't a video."); return; }
    if (objUrl.current) URL.revokeObjectURL(objUrl.current);
    objUrl.current = URL.createObjectURL(file);
    void run(objUrl.current, file.name);
  }

  function togglePlay() {
    const v = vidRef.current;
    if (!v) return;
    if (v.paused) { void v.play(); } else v.pause();
  }

  async function scoreCaption() {
    if (!caption.trim()) return;
    setScoring(true); setScoreErr(null);
    try {
      const preds = await predictBatch(NETS.map((n) => ({ text: caption.trim(), source: n.key as Source, audience: audiences[n.key], model: apiModel })));
      setScores({ youtube: preds[0], x: preds[1], reddit: preds[2] });
    } catch (e) {
      setScoreErr(e instanceof Error ? e.message : "error");
    } finally {
      setScoring(false);
    }
  }

  const advice = report ? videoAdvice(report, lang) : null;
  const orient = report ? (report.orientation === "vertical" ? (vi ? "Dọc" : "Vertical") : report.orientation === "horizontal" ? (vi ? "Ngang" : "Horizontal") : (vi ? "Vuông" : "Square")) : "";
  const dur = report?.duration || vidRef.current?.duration || 0;
  const who = handle(account);
  const sampleCaption = vi
    ? "Đổ xăng mỗi tuần, kẹt khói mỗi ngày? Xe máy điện đi 120 km mỗi lần sạc, sạc đầy khoảng 4.500 đ tiền điện. Lái thử miễn phí cuối tuần này!"
    : "Filling up every week, stuck in smoke every day? This e-scooter does 120 km per charge, and a full charge costs about 4,500 VND. Free test ride this weekend!";

  const videoEl = src && (
    <video
      ref={vidRef}
      className="clip-video"
      src={src}
      muted={muted}
      playsInline
      loop
      onClick={togglePlay}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
    />
  );
  const icons = {
    heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
    chat: "M4 5h16v11H9l-5 4V5Z",
    share: "M14 4l6 6-6 6M20 10H9a5 5 0 0 0-5 5v4",
  };
  const Ico = ({ d, size = 26 }: { d: string; size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );

  return (
    <div className="composer card vlab">
      <div className="composer-grid">
        <div className="desk">
          <div className="step-label"><b>1</b>{vi ? "Clip của bạn" : "Your clip"}</div>

          <div className="clip-style" role="tablist" aria-label={vi ? "Kiểu hiển thị" : "Display style"}>
            <button role="tab" aria-selected={style === "tiktok"} className={style === "tiktok" ? "on" : ""} onClick={() => setStyle("tiktok")}>TikTok / Reels</button>
            <button role="tab" aria-selected={style === "facebook"} className={style === "facebook" ? "on" : ""} onClick={() => setStyle("facebook")}>Facebook</button>
          </div>

          <div
            className={`phone vphone clip-${style}${drag ? " drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
          >
            <div className="phone-notch" aria-hidden="true" />
            {!src ? (
              <button type="button" className="vdrop" onClick={() => fileRef.current?.click()}>
                <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M4 6h11v12H4zM15 10l5-3v10l-5-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                <strong>{vi ? "Kéo video vào đây" : "Drop a video here"}</strong>
                <span>{vi ? "hoặc bấm để chọn file .mp4, .mov, .webm" : "or click to choose an .mp4, .mov or .webm"}</span>
              </button>
            ) : style === "tiktok" ? (
              <div className="tt">
                {videoEl}
                {!playing && <button type="button" className="clip-play" onClick={togglePlay} aria-label={vi ? "Phát" : "Play"}><svg viewBox="0 0 24 24" width="34" height="34"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></button>}
                <div className="tt-rail">
                  <span className="tt-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" /></svg></span>
                  <span><Ico d={icons.heart} /></span>
                  <span><Ico d={icons.chat} /></span>
                  <span><Ico d={icons.share} /></span>
                  <button type="button" className="tt-mute" onClick={() => setMuted((m) => !m)} aria-label={muted ? (vi ? "Bật tiếng" : "Unmute") : (vi ? "Tắt tiếng" : "Mute")}>
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={muted ? "M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6" : "M4 9h4l5-4v14l-5-4H4zM17 8a5 5 0 0 1 0 8"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
                <div className="tt-cap">
                  <strong>{who}</strong>
                  <p className={moreOpen ? "open" : ""} onClick={() => setMoreOpen((o) => !o)}>{caption || (vi ? "Viết chú thích cho clip ở ô bên dưới…" : "Write the clip's caption below…")}</p>
                  <span className="tt-sound">♪ {vi ? "Âm thanh gốc" : "Original sound"} · {who}</span>
                </div>
                <div className="clip-bar" aria-hidden="true"><i style={{ width: `${dur ? (time / dur) * 100 : 0}%` }} /></div>
              </div>
            ) : (
              <div className="fb">
                <div className="fb-head">
                  <span className="tt-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor" /></svg></span>
                  <div><strong>{account || (vi ? "Thương hiệu xe điện" : "EV brand")}</strong><span>{vi ? "Được tài trợ" : "Sponsored"}</span></div>
                </div>
                <p className={`fb-cap${moreOpen ? " open" : ""}`} onClick={() => setMoreOpen((o) => !o)}>{caption || (vi ? "Viết chú thích cho clip ở ô bên dưới…" : "Write the clip's caption below…")}</p>
                <div className="fb-media">
                  {videoEl}
                  {!playing && <button type="button" className="clip-play" onClick={togglePlay} aria-label={vi ? "Phát" : "Play"}><svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></button>}
                  <div className="clip-bar" aria-hidden="true"><i style={{ width: `${dur ? (time / dur) * 100 : 0}%` }} /></div>
                </div>
                <div className="fb-actions" aria-hidden="true">
                  <span><Ico d={icons.heart} size={18} />{vi ? "Thích" : "Like"}</span>
                  <span><Ico d={icons.chat} size={18} />{vi ? "Bình luận" : "Comment"}</span>
                  <span><Ico d={icons.share} size={18} />{vi ? "Chia sẻ" : "Share"}</span>
                </div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => pick(e.target.files?.[0])} />

          {(busy || report) && (
            <div className="vstrip" aria-hidden="true">
              <div className="vstrip-frames">
                {report?.thumbs.map((th) => <img key={th.t} src={th.src} alt="" />)}
                {busy && !report && Array.from({ length: 8 }, (_, i) => <i key={i} />)}
              </div>
              {report?.cuts.map((c) => <b key={c} className="vstrip-cut" style={{ left: `${(c / report.duration) * 100}%` }} />)}
              {busy && <span className="vstrip-scan" style={{ left: `${progress * 100}%` }} />}
              {!busy && dur > 0 && <span className="vstrip-now" style={{ left: `${(time / dur) * 100}%` }} />}
            </div>
          )}

          <label className="clip-caption">
            <span>{vi ? "Chú thích của clip" : "Clip caption"}</span>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} placeholder={vi ? "Câu chữ đi kèm video, như khi đăng lên TikTok hay Facebook" : "The words that go with the video, as you'd post them"} />
          </label>

          <div className="chip-row">
            <button type="button" className="example-chip" onClick={() => fileRef.current?.click()}>{vi ? "Chọn video của bạn" : "Choose your video"}</button>
            <button type="button" className="tmpl-chip" onClick={() => void run(SAMPLE, vi ? "Video mẫu (10 giây)" : "Sample video (10 s)", sampleCaption)}>{vi ? "Dùng video mẫu" : "Use the sample video"}</button>
          </div>
          <p className="vprivacy">{vi ? "Video được xử lý ngay trên máy bạn, không tải lên đâu cả." : "The video is processed on your device and never uploaded."}</p>
        </div>

        <div className="vresult">
          <div className="step-label"><b>2</b>{vi ? "Xem clip đi xa tới đâu" : "See how far the clip goes"}</div>
          {!busy && !report && !error && (
            <div className="vempty">{vi ? "Chọn một video hoặc dùng video mẫu, kết quả sẽ hiện ở đây." : "Choose a video or use the sample; results appear here."}</div>
          )}
          {error && <div className="error">{error}</div>}
          {busy && (
            <div className="vbusy" role="status">
              <span className="spinner" />
              {vi ? `Đang xem từng khung hình… ${Math.round(progress * 100)}%` : `Going through the frames… ${Math.round(progress * 100)}%`}
            </div>
          )}

          {report && advice && (
            <>
              <div className="vsub first">{vi ? "Phần hình" : "The picture"} <span className="vname">{name}</span></div>
              <div className="vfacts">
                <div><span>{vi ? "Thời lượng" : "Length"}</span><strong>{fmtTime(report.duration, vi)}</strong></div>
                <div><span>{vi ? "Khung hình" : "Frame"}</span><strong>{orient}</strong></div>
                <div><span>{vi ? "Độ phân giải" : "Resolution"}</span><strong>{report.width}×{report.height}</strong></div>
                <div><span>{vi ? "Chuyển cảnh" : "Scene changes"}</span><strong>{report.cuts.length}</strong><em>{vi ? `${report.cutsPer10s.toFixed(1)} lần / 10 giây` : `${report.cutsPer10s.toFixed(1)} per 10 s`}</em></div>
                <div><span>{vi ? "3 giây đầu" : "First 3 s"}</span><strong>{report.openingMotion >= 0.25 || report.cuts.some((c) => c <= 3) ? (vi ? "Có" : "Yes") : (vi ? "Ít" : "Little")}</strong><em>{vi ? "chuyển động" : "movement"}</em></div>
                <div><span>{vi ? "Độ sáng" : "Brightness"}</span><strong>{Math.round(report.brightness * 100)}%</strong></div>
              </div>

              <div className="vsub">{vi ? "Phần chữ" : "The words"}</div>
              {!scores && (
                <button type="button" className="launch small" onClick={() => void scoreCaption()} disabled={scoring || !caption.trim()}>
                  {scoring ? (vi ? "Đang chấm…" : "Scoring…") : (vi ? "Chấm điểm chú thích trên 3 mạng" : "Score the caption on 3 networks")}
                </button>
              )}
              {!caption.trim() && <p className="vhint">{vi ? "Viết chú thích ở ô bên trái để chấm phần chữ." : "Write a caption on the left to score the words."}</p>}
              {scoreErr && <div className="warn">{vi ? `Chưa chấm được: ${scoreErr}` : `Couldn't score: ${scoreErr}`}</div>}
              {scores && (
                <div className="vscores">
                  {NETS.map((n) => {
                    const p = scores[n.key];
                    const low = p.viral_score < DECISION_THRESHOLD;
                    return (
                      <div key={n.key} className="vscore">
                        <span>{n.name}</span>
                        <strong className={low ? "low" : ""}>{Math.round(p.viral_score * 100)}<small>%</small></strong>
                        <ChargeCells value={p.viral_score} low={low} />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="vsub">{vi ? "Hợp để đăng lên" : "Suits"}</div>
              <div className="vfits">
                {advice.fits.length ? advice.fits.map((f) => (
                  <span key={f.key} className="vfit"><strong>{f.label}</strong>{f.why}</span>
                )) : <span className="vfit none">{vi ? "Chưa hợp hẳn nền tảng nào theo độ dài và khung hình." : "Doesn't clearly suit a platform by length and frame."}</span>}
              </div>

              <div className="vsub">{vi ? "Nên thử" : "Worth trying"}</div>
              <ul className="vtips">{advice.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>

              <p className="vnote">
                {vi
                  ? "Bản thử nghiệm. Phần hình được đo trực tiếp từ video và gợi ý dựa trên vài quy tắc đơn giản; chỉ phần chữ được chấm bằng mô hình."
                  : "Beta. The picture is measured from the video and the suggestions come from a few simple rules; only the words are scored by the model."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

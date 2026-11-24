"use client";

// "Video (demo)" mode of the analyse page. Measures a clip in the browser, shows the
// measurements on the same LED boards as the rest of the site, and suggests fixes from
// a few plain rules. Nothing is uploaded and no model runs; the page says so.

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { probeVideo, videoAdvice, type VideoReport } from "@/lib/video-probe";

const SAMPLE = "/samples/ev-sample.webm";

function fmtTime(s: number, vi: boolean) {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m ? `${m}:${String(r).padStart(2, "0")}` : vi ? `${r} giây` : `${r} s`;
}

export default function VideoLab() {
  const { lang } = useT();
  const vi = lang === "vi";
  const [src, setSrc] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<VideoReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const objUrl = useRef<string | null>(null);

  useEffect(() => () => { if (objUrl.current) URL.revokeObjectURL(objUrl.current); }, []);

  async function run(url: string, label: string) {
    setSrc(url); setName(label); setReport(null); setError(null); setProgress(0); setBusy(true);
    try {
      setReport(await probeVideo(url, setProgress));
    } catch (e) {
      setError(vi ? "Không đọc được video này. Thử file .mp4 hoặc .webm khác." : "Couldn't read this video. Try another .mp4 or .webm file.");
      void e;
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

  const advice = report ? videoAdvice(report, lang) : null;
  const orient = report ? (report.orientation === "vertical" ? (vi ? "Dọc" : "Vertical") : report.orientation === "horizontal" ? (vi ? "Ngang" : "Horizontal") : (vi ? "Vuông" : "Square")) : "";

  return (
    <div className="composer card vlab">
      <div className="composer-grid">
        <div className="desk">
          <div className="step-label"><b>1</b>{vi ? "Chọn video" : "Pick a video"}</div>
          <div
            className={`phone vphone${drag ? " drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
          >
            <div className="phone-notch" aria-hidden="true" />
            {src ? (
              <video className="vphone-video" src={src} controls muted playsInline />
            ) : (
              <button type="button" className="vdrop" onClick={() => fileRef.current?.click()}>
                <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M4 6h11v12H4zM15 10l5-3v10l-5-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                <strong>{vi ? "Kéo video vào đây" : "Drop a video here"}</strong>
                <span>{vi ? "hoặc bấm để chọn file .mp4, .mov, .webm" : "or click to choose an .mp4, .mov or .webm"}</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => pick(e.target.files?.[0])} />

          {/* timeline: thumbnails, cut marks, and the scan line while measuring */}
          {(busy || report) && (
            <div className="vstrip" aria-hidden="true">
              <div className="vstrip-frames">
                {report?.thumbs.map((th) => <img key={th.t} src={th.src} alt="" />)}
                {busy && !report && Array.from({ length: 8 }, (_, i) => <i key={i} />)}
              </div>
              {report?.cuts.map((c) => <b key={c} className="vstrip-cut" style={{ left: `${(c / report.duration) * 100}%` }} />)}
              {busy && <span className="vstrip-scan" style={{ left: `${progress * 100}%` }} />}
            </div>
          )}

          <div className="chip-row">
            <button type="button" className="example-chip" onClick={() => fileRef.current?.click()}>{vi ? "Chọn video của bạn" : "Choose your video"}</button>
            <button type="button" className="tmpl-chip" onClick={() => void run(SAMPLE, vi ? "Video mẫu (10 giây)" : "Sample video (10 s)")}>{vi ? "Dùng video mẫu" : "Use the sample video"}</button>
          </div>
          <p className="vprivacy">{vi ? "Video được xử lý ngay trên máy bạn, không tải lên đâu cả." : "The video is processed on your device and never uploaded."}</p>
        </div>

        <div className="vresult">
          <div className="step-label"><b>2</b>{vi ? "Xem kết quả đo" : "See what we measured"}</div>
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
              <div className="vname">{name}</div>
              <div className="vfacts">
                <div><span>{vi ? "Thời lượng" : "Length"}</span><strong>{fmtTime(report.duration, vi)}</strong></div>
                <div><span>{vi ? "Khung hình" : "Frame"}</span><strong>{orient}</strong></div>
                <div><span>{vi ? "Độ phân giải" : "Resolution"}</span><strong>{report.width}×{report.height}</strong></div>
                <div><span>{vi ? "Chuyển cảnh" : "Scene changes"}</span><strong>{report.cuts.length}</strong><em>{vi ? `${report.cutsPer10s.toFixed(1)} lần / 10 giây` : `${report.cutsPer10s.toFixed(1)} per 10 s`}</em></div>
                <div><span>{vi ? "3 giây đầu" : "First 3 s"}</span><strong>{report.openingMotion >= 0.25 || report.cuts.some((c) => c <= 3) ? (vi ? "Có" : "Yes") : (vi ? "Ít" : "Little")}</strong><em>{vi ? "chuyển động" : "movement"}</em></div>
                <div><span>{vi ? "Độ sáng" : "Brightness"}</span><strong>{Math.round(report.brightness * 100)}%</strong></div>
              </div>

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
                  ? "Đây là bản demo. Các con số được đo trực tiếp từ video; gợi ý dựa trên vài quy tắc đơn giản, chưa dùng mô hình dự đoán."
                  : "This is a demo. The numbers are measured from the video itself; the suggestions come from a few simple rules, not a prediction model."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

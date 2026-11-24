// Video demo for the analyse page. No model is involved: everything here is measured
// from the file inside the browser (the video is never uploaded), and the advice that
// follows is a handful of plain rules. The page says so next to the results.

export interface VideoReport {
  duration: number; // seconds
  width: number;
  height: number;
  orientation: "vertical" | "horizontal" | "square";
  cuts: number[]; // times (s) where the picture changes sharply
  cutsPer10s: number;
  openingMotion: number; // 0–1, how much the first 3 seconds move
  brightness: number; // 0–1 average luma
  thumbs: { t: number; src: string }[];
}

const SMALL_W = 64;

function once(el: HTMLMediaElement, ev: string) {
  return new Promise<void>((resolve, reject) => {
    const ok = () => { cleanup(); resolve(); };
    const bad = () => { cleanup(); reject(new Error("The video could not be read.")); };
    const cleanup = () => { el.removeEventListener(ev, ok); el.removeEventListener("error", bad); };
    el.addEventListener(ev, ok, { once: true });
    el.addEventListener("error", bad, { once: true });
  });
}

async function seek(v: HTMLVideoElement, t: number) {
  const p = once(v, "seeked");
  v.currentTime = t;
  await p;
}

/** Browser-recorded webm files often report an infinite duration until you seek to the end. */
async function realDuration(v: HTMLVideoElement) {
  if (Number.isFinite(v.duration) && v.duration > 0) return v.duration;
  const p = once(v, "durationchange");
  v.currentTime = 1e7;
  await Promise.race([p, new Promise((r) => setTimeout(r, 3000))]);
  const d = Number.isFinite(v.duration) ? v.duration : 0;
  await seek(v, 0);
  return d;
}

export async function probeVideo(src: string, onProgress?: (done: number) => void): Promise<VideoReport> {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.crossOrigin = "anonymous";
  v.src = src;
  await once(v, "loadeddata");
  const duration = await realDuration(v);
  if (!duration) throw new Error("Could not tell how long this video is.");

  const width = v.videoWidth, height = v.videoHeight;
  const ratio = width / height;
  const orientation = ratio < 0.9 ? "vertical" : ratio > 1.1 ? "horizontal" : "square";

  const smallH = Math.max(8, Math.round(SMALL_W / ratio));
  const small = document.createElement("canvas");
  small.width = SMALL_W; small.height = smallH;
  const sg = small.getContext("2d", { willReadFrequently: true })!;
  const thumb = document.createElement("canvas");
  thumb.width = 120; thumb.height = Math.round(120 / ratio);
  const tg = thumb.getContext("2d")!;

  const step = Math.max(0.2, duration / 120);
  const times: number[] = [];
  for (let t = 0; t < duration - 0.05; t += step) times.push(t);
  const thumbEvery = Math.max(1, Math.floor(times.length / 8));

  let prev: Uint8ClampedArray | null = null;
  const diffs: { t: number; d: number }[] = [];
  const thumbs: { t: number; src: string }[] = [];
  let lumaSum = 0;

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    await seek(v, t);
    sg.drawImage(v, 0, 0, SMALL_W, smallH);
    const px = sg.getImageData(0, 0, SMALL_W, smallH).data;
    let luma = 0, diff = 0;
    for (let k = 0; k < px.length; k += 4) {
      const y = 0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2];
      luma += y;
      if (prev) diff += Math.abs(y - (0.2126 * prev[k] + 0.7152 * prev[k + 1] + 0.0722 * prev[k + 2]));
    }
    const n = px.length / 4;
    lumaSum += luma / n / 255;
    if (prev) diffs.push({ t, d: diff / n });
    prev = new Uint8ClampedArray(px);
    if (i % thumbEvery === 0 && thumbs.length < 8) {
      tg.drawImage(v, 0, 0, thumb.width, thumb.height);
      thumbs.push({ t, src: thumb.toDataURL("image/jpeg", 0.7) });
    }
    onProgress?.((i + 1) / times.length);
  }

  // A cut: a sharp jump against the clip's usual frame-to-frame change.
  const sorted = diffs.map((x) => x.d).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const cuts: number[] = [];
  for (const { t, d } of diffs) {
    if (d > Math.max(22, median * 3) && (cuts.length === 0 || t - cuts[cuts.length - 1] > 0.6)) cuts.push(t);
  }
  const opening = diffs.filter((x) => x.t <= 3);
  const openingMotion = opening.length ? Math.min(1, opening.reduce((s, x) => s + x.d, 0) / opening.length / 25) : 0;

  return {
    duration, width, height, orientation, cuts,
    cutsPer10s: (cuts.length / duration) * 10,
    openingMotion,
    brightness: times.length ? lumaSum / times.length : 0,
    thumbs,
  };
}

export type Fit = "shorts" | "youtube" | "x";

/** Plain rules, not a model: which platforms the shape and length suit, and what to try. */
export function videoAdvice(r: VideoReport, lang: "vi" | "en") {
  const vi = lang === "vi";
  const fits: { key: Fit; label: string; why: string }[] = [];
  if (r.orientation === "vertical" && r.duration <= 60) fits.push({ key: "shorts", label: vi ? "YouTube Shorts / Reels / TikTok" : "YouTube Shorts / Reels / TikTok", why: vi ? "khung dọc, dưới 60 giây" : "vertical, under 60 seconds" });
  if (r.orientation !== "vertical" && r.duration >= 60) fits.push({ key: "youtube", label: "YouTube", why: vi ? "khung ngang, đủ dài để kể chuyện" : "horizontal and long enough to tell a story" });
  if (r.duration <= 140) fits.push({ key: "x", label: "X", why: vi ? "dưới 2 phút 20 giây, đăng thẳng được" : "under 2:20, can be posted as is" });

  const tips: string[] = [];
  if (r.openingMotion < 0.25 && !r.cuts.some((c) => c <= 3)) tips.push(vi ? "3 giây đầu hơi đứng hình. Mở bằng một cảnh đang chuyển động, ví dụ xe đang chạy, để người xem không lướt qua." : "The first 3 seconds barely move. Open on something in motion, like the car driving, so people don't scroll past.");
  if (r.cutsPer10s < 1 && r.duration > 15) tips.push(vi ? "Ít chuyển cảnh. Với video ngắn, đổi cảnh khoảng 2–4 giây một lần thường giữ người xem tốt hơn." : "Few scene changes. In short videos, a new shot every 2–4 seconds usually holds attention better.");
  if (r.cutsPer10s > 6) tips.push(vi ? "Cắt cảnh rất dày, người xem có thể không kịp đọc chữ trên màn hình." : "Very fast cutting; viewers may not have time to read on-screen text.");
  if (r.brightness < 0.25) tips.push(vi ? "Hình khá tối, xem trên điện thoại ngoài trời sẽ khó thấy." : "The picture is quite dark and will be hard to see on a phone outdoors.");
  if (r.orientation === "horizontal" && r.duration <= 60) tips.push(vi ? "Video ngắn nhưng khung ngang. Nếu đăng Shorts hay Reels, nên làm thêm một bản khung dọc." : "Short but horizontal. For Shorts or Reels, make a vertical cut too.");
  if (r.duration > 180) tips.push(vi ? "Video dài hơn 3 phút. Cắt thêm một bản 30–60 giây để dùng cho mạng xã hội." : "Over 3 minutes. Cut a 30–60 second version for social media.");
  if (!tips.length) tips.push(vi ? "Không thấy vấn đề gì rõ ràng về nhịp và khung hình. Phần còn lại nằm ở nội dung, xem điểm và bình luận dự đoán của phần chữ ở trên." : "Nothing obvious to fix in pacing or framing. The rest is content; see the score and predicted comments for the words above.");
  return { fits, tips };
}

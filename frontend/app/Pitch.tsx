"use client";

// Landing sections after the film. They are written for the people who use the tool,
// in plain words; the contest themes (air, energy, flooding, a working product, a plan)
// are covered by what the sections say, not by labels pointing at the judging sheet.
// Claims must stay checkable: figures come from story-content.ts, features from code.

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/types";
import { useLang } from "./LangContext";

type L = Record<Lang, string>;
const REPO = "https://github.com/hbquyen2812/ev-campaign-analyser";

// ---------------------------------------------------------------- the city
const CITY: { key: string; title: L; text: L }[] = [
  {
    key: "air",
    title: { vi: "Không khí ngoài phố", en: "The air on the street" },
    text: {
      vi: "Ở Hà Nội, khoảng hai phần ba lượng bụi do xe cộ thải ra là từ xe máy. Bớt được chiếc xe xăng nào là ngoài phố bớt khói chiếc đó.",
      en: "In Hanoi, about two-thirds of the dust vehicles put out comes from motorbikes. Every petrol bike that goes means a little less smoke outside.",
    },
  },
  {
    key: "power",
    title: { vi: "Điện từ đâu ra", en: "Where the power comes from" },
    text: {
      vi: "Năm 2024, khoảng một nửa điện ở mình vẫn từ than, nên xe điện chưa sạch hoàn toàn. Quảng cáo nói thật chuyện này thì người mua mới tin những điều còn lại.",
      en: "In 2024 about half our electricity still came from coal, so EVs aren't fully clean yet. Ads that say so honestly are the ones people believe on everything else.",
    },
  },
  {
    key: "rain",
    title: { vi: "Mùa mưa ngập", en: "Flood season" },
    text: {
      vi: "Đường ngập là chuyện thường ở thành phố mình, và người mua hỏi thẳng chuyện đó. Người bán cần trả lời rõ xe lội được tới đâu, chứ không phải hứa cho qua.",
      en: "Flooded streets are normal here, and buyers ask about it straight out. Sellers need to say clearly how deep the bike can go, not just promise it's fine.",
    },
  },
];

export function WefeFit() {
  const { lang } = useLang();
  return (
    <section className="pitch" id="city">
      <h2 className="section-head">{lang === "vi" ? "Chuyện này dính tới cả thành phố" : "This is about the whole city"}</h2>
      <div className="city">
        {CITY.map((c) => (
          <article key={c.key} className={`city-card ${c.key}`}>
            <h3>{c.title[lang]}</h3>
            <p>{c.text[lang]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- what you can do
const DO: { title: L; text: L; href: string; cta: L; icon: string }[] = [
  {
    icon: "M3 17l6-6 4 4 8-8M15 7h6v6",
    title: { vi: "Biết bài sẽ đi xa tới đâu", en: "See how far a post will go" },
    text: {
      vi: "Dán bài vào là có điểm cho YouTube, X và Reddit, kèm lý do vì sao điểm cao hay thấp. Mô hình học từ 58.020 bài đăng thật.",
      en: "Paste a post and get a score for YouTube, X and Reddit, with the reasons it's high or low. The model learned from 58,020 real posts.",
    },
    href: "/analyze", cta: { vi: "Thử với bài của bạn", en: "Try it on your post" },
  },
  {
    icon: "M4 5h16v10H9l-5 4V5Z",
    title: { vi: "Đọc trước bình luận", en: "Read the comments first" },
    text: {
      vi: "Ba vị khách ảo, dựng từ bình luận và bài đăng thật của người Việt, sẽ hỏi đúng mấy câu khách thật hay hỏi. Tập trả lời trước thì đỡ bị hỏi khó lần đầu trước mặt khách.",
      en: "Three virtual customers, built from real comments and posts by Vietnamese people, ask the questions real buyers ask. Practise first, so the hard question isn't new when a customer asks it.",
    },
    href: "/coach", cta: { vi: "Nói chuyện với khách ảo", en: "Talk to a virtual customer" },
  },
  {
    icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z M9 12l2 2 4-4",
    title: { vi: "Không lỡ tay bịa số", en: "No made-up numbers" },
    text: {
      vi: "Câu trả lời gợi ý chỉ dùng số có trong bảng thông số. Số nào không có nguồn sẽ bị bỏ ra và báo cho bạn biết.",
      en: "Suggested answers only use numbers from the spec sheet. Anything without a source is taken out, and you're told about it.",
    },
    href: "/analyze", cta: { vi: "Xem thử", en: "Have a look" },
  },
];

export function Novelty() {
  const { lang } = useLang();
  return (
    <section className="pitch" id="tools">
      <h2 className="section-head">{lang === "vi" ? "Bạn làm được gì ở đây" : "What you can do here"}</h2>
      <div className="novel">
        {DO.map((n) => (
          <article key={n.title.en} className="novel-card">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" className="novel-icon">
              {n.icon.split(" M").map((d, i) => <path key={i} d={(i ? "M" : "") + d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />)}
            </svg>
            <h3>{n.title[lang]}</h3>
            <p>{n.text[lang]}</p>
            <Link href={n.href} className="novel-link">{n.cta[lang]}</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- under the hood
const PIPE: { name: L; tech: string }[] = [
  { name: { vi: "Thu thập", en: "Collect" }, tech: "YouTube · X · Reddit" },
  { name: { vi: "Làm sạch & ẩn danh", en: "Clean & anonymise" }, tech: "Kafka · Spark" },
  { name: { vi: "Kho dữ liệu", en: "Lakehouse" }, tech: "Bronze/Silver · Airflow" },
  { name: { vi: "Mô hình", en: "Model" }, tech: "XGBoost · SHAP · FastAPI" },
  { name: { vi: "Ứng dụng web", en: "Web app" }, tech: "Next.js · LLM" },
];

export function Working() {
  const { lang } = useLang();
  const [live, setLive] = useState<"checking" | "up" | "down">("checking");
  useEffect(() => {
    let off = false;
    fetch("/api/ai/health", { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (!off) setLive(ok && j?.status === "ok" ? "up" : "down"); })
      .catch(() => { if (!off) setLive("down"); });
    return () => { off = true; };
  }, []);
  const status: Record<typeof live, L> = {
    checking: { vi: "Đang kiểm tra mô hình…", en: "Checking the model…" },
    up: { vi: "Mô hình chấm điểm đang chạy", en: "The scoring model is running" },
    down: { vi: "Mô hình chấm điểm đang tạm nghỉ. Phần bình luận dự đoán và luyện tập vẫn dùng được.", en: "The scoring model is taking a break. Predicted comments and practice still work." },
  };
  return (
    <section className="pitch" id="under">
      <h2 className="section-head">{lang === "vi" ? "Bên trong có gì" : "What's inside"}</h2>
      <p className={`live-pill ${live}`} role="status"><i aria-hidden="true" />{status[live][lang]}</p>
      <ol className="pipe" aria-label={lang === "vi" ? "Dữ liệu đi qua những bước nào" : "The steps data goes through"}>
        {PIPE.map((p) => (
          <li key={p.tech}><strong>{p.name[lang]}</strong><span>{p.tech}</span></li>
        ))}
      </ol>
      <div className="proof-links">
        <Link href="/insights">{lang === "vi" ? "Dữ liệu và độ tin cậy của mô hình" : "Data and model reliability"}</Link>
        <a href={REPO} target="_blank" rel="noreferrer">{lang === "vi" ? "Mã nguồn trên GitHub" : "Source code on GitHub"}</a>
        <a href={`${REPO}/blob/main/docs/ARCHITECTURE.md`} target="_blank" rel="noreferrer">{lang === "vi" ? "Ghi chú kiến trúc" : "Architecture notes"}</a>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- what's next
const PLAN: { when: L; title: L; items: L[] }[] = [
  {
    when: { vi: "Đến cuối 2026", en: "By end of 2026" },
    title: { vi: "Chạy ổn định hơn", en: "Steadier" },
    items: [
      { vi: "Chuyển máy chủ mô hình lên đám mây, không chạy trên máy cá nhân nữa.", en: "Move the model server to the cloud, off personal machines." },
      { vi: "Thêm dữ liệu tiếng Việt và thêm vài vị khách ảo mới.", en: "Add more Vietnamese data and a few new virtual customers." },
    ],
  },
  {
    when: { vi: "2027", en: "2027" },
    title: { vi: "Dùng thử với người thật", en: "Real people, real use" },
    items: [
      { vi: "Cho đội marketing và nhân viên bán xe điện dùng thử, xem khách có tin họ hơn sau khi luyện tập không.", en: "Let EV marketing teams and sales staff use it, and see whether customers trust them more after practice." },
      { vi: "Xem bài đã kiểm tra trước có bớt câu hỏi tiêu cực sau khi đăng không.", en: "Check whether posts tested beforehand get fewer negative questions once live." },
    ],
  },
  {
    when: { vi: "Sau đó", en: "After that" },
    title: { vi: "Không chỉ xe điện", en: "Beyond EVs" },
    items: [
      { vi: "Dùng cách làm này cho các chủ đề xanh khác, như điện mặt trời mái nhà, phân loại rác, tiết kiệm nước.", en: "Use the same approach for other green topics, like rooftop solar, sorting waste and saving water." },
    ],
  },
];

export function Plan() {
  const { lang } = useLang();
  return (
    <section className="pitch" id="next">
      <h2 className="section-head">{lang === "vi" ? "Sắp tới" : "What's next"}</h2>
      <ol className="plan">
        {PLAN.map((p) => (
          <li key={p.when.en}>
            <span className="plan-when">{p.when[lang]}</span>
            <h3>{p.title[lang]}</h3>
            <ul>{p.items.map((it, i) => <li key={i}>{it[lang]}</li>)}</ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

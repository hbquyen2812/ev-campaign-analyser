// Script for the landing-page "film": what the subtitles say, when, and which verified
// figure appears on screen. Figures are taken from story-content.ts so the film and the
// chapter fallback can never quote different numbers.

import type { Lang } from "@/lib/types";
import { CHAPTERS, type Figure } from "./story-content";

type L = Record<Lang, string>;

const fig = (chapter: string, i: number): Figure => {
  const f = CHAPTERS.find((c) => c.id === chapter)?.figures?.[i];
  if (!f) throw new Error(`missing figure ${chapter}[${i}]`);
  return f;
};

/** Timeline positions (0–1 of the scroll) where each scene starts, for the scrubber. */
export const SCENES: { at: number; label: L }[] = [
  { at: 0.04, label: { vi: "Phố sáng sớm", en: "Morning street" } },
  { at: 0.26, label: { vi: "Chiếc điện thoại", en: "The phone" } },
  { at: 0.44, label: { vi: "Trời đổ mưa", en: "The rain" } },
  { at: 0.64, label: { vi: "Tin đồn", en: "The rumour" } },
  { at: 0.84, label: { vi: "Trạm dừng", en: "The stop" } },
];

export interface Beat { a: number; b: number; text: L; figs?: Figure[]; tone?: "warn" | "green" }

export const BEATS: Beat[] = [
  {
    a: 0.05, b: 0.13, figs: [fig("shift", 0)],
    text: {
      vi: "Năm 2025, cứ 10 chiếc ô tô mới bán ra ở Việt Nam thì gần 4 chiếc chạy điện. Tính chung cả thế giới mới được khoảng 1 trên 4.",
      en: "In 2025, almost 4 of every 10 new cars sold in Vietnam ran on electricity. Worldwide it was about 1 in 4.",
    },
  },
  {
    a: 0.13, b: 0.20, figs: [fig("shift", 2)],
    text: {
      vi: "Xe máy cũng vậy. Khoảng 32% xe máy mới bán ra là xe điện, tức cỡ 3 trong 10 chiếc bạn đang thấy trên phố này.",
      en: "Motorbikes too. About 32% of the new ones sold are electric, roughly 3 of the 10 you can see on this street.",
    },
  },
  {
    a: 0.20, b: 0.235, figs: [fig("shift", 1)],
    text: {
      vi: "Riêng VinFast đã giao 175.099 xe điện trong nước năm 2025. Mua xe điện còn được miễn lệ phí trước bạ tới hết năm 2030.",
      en: "VinFast alone handed over 175,099 EVs in Vietnam in 2025. And EV buyers pay no registration fee until the end of 2030.",
    },
  },
  {
    a: 0.26, b: 0.35, figs: [fig("online", 1)],
    text: {
      vi: "Có điều trước khi ra showroom, ai cũng xem xe trên điện thoại trước đã.",
      en: "Still, before anyone goes to a showroom, they look the car up on their phone.",
    },
  },
  {
    a: 0.35, b: 0.44, figs: [fig("online", 2)],
    text: {
      vi: "Gần một nửa người mua đọc đánh giá trên mạng rồi mới quyết. Đăng quảng cáo bây giờ là đăng luôn cả phần bình luận bên dưới.",
      en: "Almost half of buyers read online reviews before they decide. Post an ad today and you're posting the comments under it too.",
    },
  },
  {
    a: 0.44, b: 0.54, figs: [fig("doubt", 0), fig("doubt", 1), fig("doubt", 2)],
    tone: "warn",
    text: {
      vi: "Mà bình luận thì toàn là lo lắng. Hỏi người Việt, vẫn có một nửa nói lần tới sẽ mua xe xăng.",
      en: "And the comments are mostly worries. Ask Vietnamese buyers and half still say their next one will be petrol.",
    },
  },
  {
    a: 0.54, b: 0.64,
    text: {
      vi: "Có những chuyện chưa khảo sát nào hỏi tới, như ngập nước hay nhà trọ không cho sạc. Mấy câu trong bong bóng là người Việt tự viết, nhóm mình lấy từ dữ liệu của dự án.",
      en: "Some worries no survey has asked about yet, like flooding or landlords who won't allow charging. The lines in the bubbles are real posts, taken from our project's data.",
    },
  },
  {
    a: 0.64, b: 0.74, figs: [fig("gap", 0)],
    text: {
      vi: "Tin đồn thì đi nhanh lắm. Ở 4 nước được khảo sát, 43–56% người chưa đi xe điện tin là xe điện dễ cháy hơn xe xăng.",
      en: "Rumours move fast. In four countries surveyed, 43–56% of people without an EV believe EVs catch fire more than petrol cars.",
    },
  },
  {
    a: 0.74, b: 0.84, figs: [fig("gap", 1)],
    text: {
      vi: "Nhưng khi được giải thích rõ ràng, người ta bớt tin chuyện đó, và 10 ngày sau vẫn vậy. Trả lời tử tế là có tác dụng.",
      en: "But once it was explained clearly, people believed it less, and still did ten days later. A decent answer works.",
    },
  },
  {
    a: 0.84, b: 0.92, figs: [fig("gap", 2)],
    text: {
      vi: "Khổ nỗi, người làm marketing chỉ biết bài mình bị hỏi gì sau khi đã đăng. Mà phản hồi thật thì đâu có nhiều.",
      en: "The catch is that marketers only find out what people ask once the post is up. And real feedback is hard to come by.",
    },
  },
  {
    a: 0.92, b: 1.01, figs: [fig("built", 0)],
    text: {
      vi: "Nên nhóm mình làm một trạm dừng trước khi đăng. Ở đây con số nào cũng phải có thật, vì quảng cáo xanh mà nói sai thì chẳng ai tin.",
      en: "So we built a stop before you post. Every number here has to be real, because a green ad that gets the facts wrong convinces no one.",
    },
  },
];

export const FILM_INTRO = {
  title: {
    vi: "Xe điện đã ra đường. Khách hàng thì vẫn đang đọc bình luận.",
    en: "EVs are already on the road. Buyers are still reading the comments.",
  },
  cue: { vi: "Cuộn để xem", en: "Scroll to play" },
};

/** What the phone's comment section shows. Illustrative lines in the personas' voice. */
export const PHONE_COMMENTS: L[] = [
  { vi: "Thay pin hết bao nhiêu?", en: "How much is a new battery?" },
  { vi: "Tính ra 5 năm có rẻ hơn xăng không?", en: "Over 5 years, is it cheaper than petrol?" },
  { vi: "Đi mưa ngập có sao không ạ?", en: "What about flooded streets?" },
  { vi: "Nhà trọ không cho sạc thì sạc ở đâu?", en: "My landlord won't allow charging. Then where?" },
  { vi: "Giá lăn bánh đã gồm pin chưa?", en: "Does the on-road price include the battery?" },
  { vi: "Sạc đầy mất bao lâu vậy?", en: "How long does a full charge take?" },
];

/** Worry bubbles in the rain, matching the three survey worries on screen. */
export const WORRIES: L[] = [
  { vi: "Một lần sạc đi được bao xa?", en: "How far on one charge?" },
  { vi: "Sạc mất bao lâu?", en: "How long to charge?" },
  { vi: "Xe điện khác xe xăng chỗ nào?", en: "How is it different from petrol?" },
];

/** Verbatim posts from the project's corpus (see personas.json seedQuotes). */
export const REAL_QUOTES = [
  "Xe máy điện mà gặp ngập nước như Clip chạy được không?",
  "Vì an toàn cho PCCC nên tp hcm hiếm chung cư, căn hộ cho thuê, nhà trọ.. cho phép cư dân sạc pin xe điện tại nơi gửi xe!",
  "Yeah the charge system in VN not welcome new commer.",
];

export const MYTH: L = { vi: "Nghe nói xe điện dễ cháy lắm?", en: "Heard EVs catch fire easily?" };
export const ANSWER: L = { vi: "Để em giải thích, kèm số liệu kiểm định nhé.", en: "Let me explain, I'll show you the test data." };
export const CONVINCED: L = { vi: "À, ra vậy.", en: "Ah, I see." };
export const STATION_SIGN: L = { vi: "Trạm dừng trước khi đăng", en: "Stop before you post" };

/**
 * The air scene is inserted after the street. Its beats are timed on the film's own
 * clock (0–1 of the scroll); the beats above are on the original clock, which the film
 * maps through toOld() so the older scenes did not have to be re-timed.
 */
export const ENV_SCENE = { a: 0.20, b: 0.36, label: { vi: "Bầu trời", en: "The air" } as L };
export const ENV_BEATS: Beat[] = [
  {
    tone: "green",
    a: 0.205, b: 0.255, figs: [fig("air", 0), fig("air", 1)],
    text: {
      vi: "Khói xe đâu chỉ là chuyện biến đổi khí hậu. Bụi mịn ở Hà Nội cao gấp hơn 9 lần mức WHO khuyên, và khoảng hai phần ba lượng bụi xe cộ thải ra là từ xe máy.",
      en: "Exhaust isn't just a climate thing. Hanoi's fine dust is over 9 times what WHO recommends, and about two-thirds of the dust vehicles put out comes from motorbikes.",
    },
  },
  {
    a: 0.255, b: 0.305, figs: [fig("air", 2), fig("air", 3)],
    text: {
      vi: "Xe điện không có ống xả, nên đổi được chiếc nào là ngoài phố bớt khói chiếc đó. Mà cả nước có hơn 74 triệu xe máy.",
      en: "EVs have no exhaust pipe, so every bike that switches means a bit less smoke on the street. And the country has over 74 million motorbikes.",
    },
  },
  {
    a: 0.305, b: 0.36, figs: [fig("air", 4), fig("air", 5), fig("air", 6)],
    text: {
      vi: "Phải nói thật là điện ở mình vẫn còn khoảng một nửa từ than. Nên tính cả vòng đời, xe điện ở Việt Nam giảm phát thải ít hơn ở châu Âu. Điện càng sạch thì càng lợi.",
      en: "Honestly, about half our electricity still comes from coal. So over its whole life, an EV in Vietnam cuts less carbon than one in Europe. The cleaner the power gets, the more it helps.",
    },
  },
];

// Copy and figures for the landing-page road story.
//
// Every figure was opened on the page it links to on 2026-11-24. Where the original
// publisher blocked automated reading (IEA, PwC), the link is the news report that
// quotes it, and the label names the original. Do not add a number here without a
// link a visitor can follow.

import type { Lang } from "@/lib/types";

type L = Record<Lang, string>;

export interface Figure {
  value: number;
  decimals?: number;
  prefix?: L;
  unit?: L;
  label: L;
  source: { name: L; url: string };
}
export interface StoryChapter {
  id: string;
  tone?: "warn" | "exit";
  title: L;
  body: L[];
  figures?: Figure[];
  quotes?: { text: string; where: L }[];
  exits?: { href: string; label: L; sub: L }[];
  note?: L;
}

const both = (s: string): L => ({ vi: s, en: s });

export const INTRO = {
  title: {
    vi: "Xe điện đã ra đường. Khách hàng thì vẫn đang đọc bình luận.",
    en: "EVs are already on the road. Buyers are still reading the comments.",
  },
  sub: {
    vi: "Vì sao nhóm mình làm ra một chỗ để thử bài quảng cáo xe điện trước khi đăng? Cuộn xuống, mình kể bằng số liệu trên một quãng đường ngắn.",
    en: "Why did we build a place to test EV ads before they go live? Scroll down and we'll tell you, with numbers, over a short drive.",
  },
  cue: { vi: "Bắt đầu lái", en: "Start driving" },
};

export const CHAPTERS: StoryChapter[] = [
  {
    id: "shift",
    title: { vi: "Việt Nam đang đổi sang điện nhanh hơn thế giới", en: "Vietnam is switching faster than the world" },
    body: [
      {
        vi: "Năm 2025, cứ mười ô tô mới bán ra ở Việt Nam thì gần bốn chiếc là xe điện. Trung bình thế giới là một trên bốn. Xe máy điện cũng đã chiếm gần một phần ba số xe máy mới.",
        en: "In 2025, nearly four in ten new cars sold in Vietnam were electric, against one in four worldwide. Electric two-wheelers are now close to a third of new motorbike sales.",
      },
      {
        vi: "Chính sách đẩy cùng chiều: xe điện chạy pin được miễn lệ phí trước bạ lần đầu đến hết năm 2030, và Hà Nội đã lên kế hoạch thí điểm hạn chế xe máy xăng ở một số phường trong Vành đai 1, theo khung giờ, từ tháng 7/2026.",
        en: "Policy pushes the same way: battery EVs are exempt from first-time registration fees until the end of 2030, and Hanoi set a plan to pilot time-limited restrictions on petrol motorbikes in some Ring Road 1 wards from July 2026.",
      },
    ],
    figures: [
      {
        value: 40, prefix: { vi: "~", en: "~" }, unit: both("%"),
        label: { vi: "ô tô mới bán ở Việt Nam năm 2025 là xe điện", en: "of new cars sold in Vietnam in 2025 were electric" },
        source: { name: { vi: "IEA Global EV Outlook 2026, qua Viet Nam News", en: "IEA Global EV Outlook 2026, via Viet Nam News" }, url: "https://vietnamnews.vn/economy/1799967/viet-nam-becomes-southeast-asia-s-largest-ev-market-as-sales-surge.html" },
      },
      {
        value: 175099,
        label: { vi: "xe điện VinFast giao cho khách trong nước năm 2025", en: "VinFast EVs delivered in Vietnam in 2025" },
        source: { name: both("Viet Nam News, 15/01/2026"), url: "https://vietnamnews.vn/economy/1763754/vinfast-sets-record-with-175-099-evs-delivered-in-2025.html" },
      },
      {
        value: 32, prefix: { vi: "~", en: "~" }, unit: both("%"),
        label: { vi: "xe máy mới bán ra là xe điện (tháng 1–9/2026)", en: "of new motorbikes sold were electric (Jan–Sep 2026)" },
        source: { name: { vi: "Electrek, theo motorcyclesdata.com", en: "Electrek, from motorcyclesdata.com" }, url: "https://electrek.co/?p=490406" },
      },
    ],
  },
  {
    id: "air",
    tone: "exit",
    title: { vi: "Và đây không chỉ là chuyện mua bán: đó là không khí ta thở", en: "And it isn't only about sales: it's the air we breathe" },
    body: [
      {
        vi: "Bụi mịn ở Hà Nội năm 2024 cao gấp hơn 9 lần mức WHO khuyến nghị. Trong lượng bụi mà xe cộ thải ra ở Hà Nội, khoảng hai phần ba là từ xe máy, mà cả nước có hơn 74 triệu chiếc. Xe điện không có ống xả, nên đổi được chiếc nào là ngoài phố bớt khói chiếc đó.",
        en: "Hanoi's fine dust in 2024 was over 9 times the WHO guideline. Of the particles vehicles emit in Hanoi, about two-thirds come from motorbikes, and Vietnam has over 74 million of them. EVs have no exhaust pipe, so every bike that switches means a bit less smoke on the street.",
      },
      {
        vi: "Phải nói thật là giao thông chỉ chiếm khoảng 9% phát thải khí nhà kính của Việt Nam, và điện ở mình vẫn còn khoảng một nửa từ than. Nên tính cả vòng đời, xe điện ở đây giảm phát thải ít hơn ở châu Âu. Xe máy điện chạy trên lưới điện nhiều than như ở Indonesia giảm được khoảng 26–35%. Điện càng sạch thì càng lợi. Riêng không khí ngoài phố thì đỡ ngay, dù xe cộ chỉ là một phần của chuyện bụi mịn.",
        en: "Honestly, transport is only about 9% of Vietnam's greenhouse emissions, and about half our power still comes from coal. So over its whole life, an EV here saves less than one in Europe. An electric scooter on a coal-heavy grid like Indonesia's cuts about 26–35%. The cleaner the power, the more it helps. Street air gets better right away, though traffic is only part of the dust problem.",
      },
    ],
    figures: [
      {
        value: 45.4, decimals: 1, unit: both(" µg/m³"),
        label: { vi: "bụi mịn PM2.5 trung bình ở Hà Nội năm 2024, gấp hơn 9 lần mức WHO khuyến nghị (5 µg/m³)", en: "average PM2.5 in Hanoi in 2024, over 9 times the WHO guideline (5 µg/m³)" },
        source: { name: { vi: "IQAir 2024, qua Viet Nam News", en: "IQAir 2024, via Viet Nam News" }, url: "https://vietnamnews.vn/environment/1693768/viet-nam-s-air-quality-23rd-worst-in-the-world-report.html" },
      },
      {
        value: 66, unit: both("%"),
        label: { vi: "lượng bụi do xe cộ thải ra ở Hà Nội đến từ xe máy (ô tô: 13%)", en: "of the particles vehicles emit in Hanoi come from motorbikes (cars: 13%)" },
        source: { name: { vi: "Nghiên cứu ĐHQG Hà Nội 2023, qua VnExpress", en: "VNU Hanoi study 2023, via VnExpress" }, url: "https://e.vnexpress.net/news/news/traffic/how-petrol-motorbikes-drive-hanoi-s-air-pollution-4914865.html" },
      },
      {
        value: 74, unit: { vi: " triệu", en: "M" },
        label: { vi: "xe máy đăng ký ở Việt Nam năm 2023, hơn 90% phương tiện cơ giới", en: "motorbikes registered in Vietnam in 2023, over 90% of motor vehicles" },
        source: { name: both("ICCT, 2025"), url: "https://theicct.org/wp-content/uploads/2025/02/ID-250-–-Vietnam-two-wheelers_report_final.pdf" },
      },
      {
        value: 9, prefix: { vi: "~", en: "~" }, unit: both("%"),
        label: { vi: "phát thải khí nhà kính của Việt Nam đến từ giao thông (2020)", en: "of Vietnam's greenhouse emissions come from transport (2020)" },
        source: { name: { vi: "Báo Nông nghiệp và Môi trường", en: "Agriculture and Environment Online" }, url: "https://van.nongnghiepmoitruong.vn/carbon-credits-from-vietnams-green-transport-transition-d772554.html" },
      },
      {
        value: 55, prefix: both(">"), unit: both("%"),
        label: { vi: "phát thải trọn vòng đời của ô tô điện thấp hơn xe xăng (trung bình thế giới)", en: "lower lifecycle emissions for an electric car than petrol (world average)" },
        source: { name: { vi: "IEA Global EV Outlook 2026", en: "IEA Global EV Outlook 2026" }, url: "https://iea.blob.core.windows.net/assets/26adc87c-daee-4de2-954e-f3f0fa9adfee/Doelectriccarsreduceemissionsoverall.pdf" },
      },
      {
        value: 35, prefix: both("26–"), unit: both("%"),
        label: { vi: "phát thải trọn vòng đời của xe máy điện thấp hơn xe xăng trên lưới điện nhiều than (Indonesia)", en: "lower lifecycle emissions for an electric scooter on a coal-heavy grid (Indonesia)" },
        source: { name: both("ICCT, 2023"), url: "https://theicct.org/wp-content/uploads/2023/09/ID-17-–-LCA-Indonesia_report_final2.pdf" },
      },
      {
        value: 49.5, decimals: 1, unit: both("%"),
        label: { vi: "điện Việt Nam năm 2024 đến từ than", en: "of Vietnam's electricity came from coal in 2024" },
        source: { name: { vi: "ĐH Bách khoa Hà Nội, qua Viet Nam News", en: "Hanoi University of Science and Technology, via Viet Nam News" }, url: "https://vietnamnews.vn/environment/1716087/study-shows-coal-power-dominant-as-viet-nam-s-grid-emissions-climbed-in-2024.html" },
      },
    ],
  },
  {
    id: "online",
    title: { vi: "Và người mua tìm hiểu trên mạng trước khi tới showroom", en: "And buyers do their research online first" },
    body: [
      {
        vi: "Gần như ai cũng ở trên mạng xã hội, và YouTube là nơi người ta xem thử xe trước khi xem tận mắt. Một bài quảng cáo giờ không nói một mình: nó đi kèm phần bình luận bên dưới.",
        en: "Almost everyone is on social media, and YouTube is where people look at a car before they see it in person. An ad no longer speaks alone: it comes with the comment section underneath.",
      },
    ],
    figures: [
      {
        value: 79, unit: { vi: " triệu", en: "M" },
        label: { vi: "tài khoản mạng xã hội ở Việt Nam (10/2025), 77,6% dân số", en: "social media user identities in Vietnam (Oct 2025), 77.6% of the population" },
        source: { name: both("DataReportal, Digital 2026 Vietnam"), url: "https://datareportal.com/reports/digital-2026-vietnam" },
      },
      {
        value: 62.1, decimals: 1, unit: { vi: " triệu", en: "M" },
        label: { vi: "người dùng YouTube ở Việt Nam cuối năm 2025", en: "YouTube users in Vietnam, late 2025" },
        source: { name: both("DataReportal, Digital 2026 Vietnam"), url: "https://datareportal.com/reports/digital-2026-vietnam" },
      },
      {
        value: 48, unit: both("%"),
        label: { vi: "người tiêu dùng Việt đọc đánh giá trên mạng trước khi mua; 42% dùng mạng xã hội để kiểm chứng thông tin sản phẩm", en: "of Vietnamese consumers read online reviews before buying; 42% use social media to check product claims" },
        source: { name: { vi: "DoubleVerify 2025, qua VietnamNet", en: "DoubleVerify 2025, via VietnamNet" }, url: "https://vietnamnet.vn/en/vietnamese-consumers-rely-on-online-reviews-before-spending-2474022.html" },
      },
    ],
  },
  {
    id: "doubt",
    tone: "warn",
    title: { vi: "Nhưng nỗi lo của họ vẫn còn nguyên", en: "But their worries haven't gone away" },
    body: [
      {
        vi: "Một khảo sát 1.000 người Việt năm 2025 cho thấy chỉ 18% định mua xe điện chạy pin cho lần tới, còn một nửa vẫn chọn xe xăng. Họ lo những chuyện rất cụ thể: đi được bao xa, sạc mất bao lâu, và đơn giản là chưa hiểu xe điện lắm.",
        en: "A 2025 survey of 1,000 Vietnamese found only 18% plan a battery EV next, while half would still pick petrol. Their worries are practical: how far it goes, how long it takes to charge, and just not knowing much about EVs yet.",
      },
      {
        vi: "Có những nỗi lo chưa khảo sát nào đo được, như ngập nước hay chỗ sạc ở nhà trọ. Chúng tôi tìm thấy chúng trong chính các bài đăng người Việt viết:",
        en: "Some worries no survey has measured yet, like flooded streets or charging in a rented room. We found them in posts Vietnamese people wrote themselves:",
      },
    ],
    figures: [
      {
        value: 46, unit: both("%"),
        label: { vi: "lo về quãng đường đi được", en: "worry about driving range" },
        source: { name: { vi: "Deloitte Automotive Consumer Study 2025, qua VIR", en: "Deloitte Automotive Consumer Study 2025, via VIR" }, url: "https://vir.com.vn/vietnamese-consumers-prefer-battery-electric-vehicles-over-hybrid-electric-vehicles-139294.html" },
      },
      {
        value: 45, unit: both("%"),
        label: { vi: "lo về thời gian sạc", en: "worry about charging time" },
        source: { name: { vi: "Deloitte Automotive Consumer Study 2025, qua VIR", en: "Deloitte Automotive Consumer Study 2025, via VIR" }, url: "https://vir.com.vn/vietnamese-consumers-prefer-battery-electric-vehicles-over-hybrid-electric-vehicles-139294.html" },
      },
      {
        value: 43, unit: both("%"),
        label: { vi: "nói mình chưa hiểu về xe điện và công nghệ của nó", en: "say they don't understand EVs or the technology" },
        source: { name: { vi: "Deloitte Automotive Consumer Study 2025, qua VIR", en: "Deloitte Automotive Consumer Study 2025, via VIR" }, url: "https://vir.com.vn/vietnamese-consumers-prefer-battery-electric-vehicles-over-hybrid-electric-vehicles-139294.html" },
      },
    ],
    quotes: [
      { text: "Xe máy điện mà gặp ngập nước như Clip chạy được không?", where: { vi: "Bài đăng trên X, trong bộ dữ liệu của dự án", en: "Post on X, from the project's dataset" } },
      { text: "Vì an toàn cho PCCC nên tp hcm hiếm chung cư, căn hộ cho thuê, nhà trọ.. cho phép cư dân sạc pin xe điện tại nơi gửi xe!", where: { vi: "Bài đăng trên X, trong bộ dữ liệu của dự án", en: "Post on X, from the project's dataset" } },
      { text: "Yeah the charge system in VN not welcome new commer.", where: { vi: "Bình luận trên Reddit, trong bộ dữ liệu của dự án", en: "Reddit comment, from the project's dataset" } },
    ],
  },
  {
    id: "gap",
    title: { vi: "Một câu trả lời tốt thay đổi được niềm tin. Một câu tệ thì ở lại dưới bài.", en: "A good answer changes minds. A bad one stays under the post." },
    body: [
      {
        vi: "Hiểu lầm về xe điện lan rộng: ở bốn nước được khảo sát, từ 43% đến 56% người chưa đi xe điện tin rằng xe điện dễ cháy hơn xe xăng. Tin tốt là cùng nghiên cứu đó cho thấy một lời giải thích rõ ràng làm niềm tin sai giảm xuống, và hiệu quả còn kéo dài sau 10 ngày.",
        en: "EV myths are widespread: across four countries, 43–56% of people who don't drive an EV believe EVs catch fire more often than petrol cars. The good news from the same study: a clear explanation lowered that belief, and the effect still held ten days later.",
      },
      {
        vi: "Vấn đề là người làm marketing chỉ biết bài của mình bị hỏi gì sau khi đã đăng, và nhân viên bán hàng thường gặp câu hỏi khó lần đầu tiên ngay trước mặt khách. Còn phản hồi thật thì hiếm: trong 3.081 lượt tương tác chúng tôi thu thập, chỉ 265 bình luận là đủ nội dung để đọc.",
        en: "The trouble is that marketers only learn what a post gets asked after it is live, and salespeople usually meet the hard question for the first time in front of a customer. Real feedback is also scarce: of 3,081 interactions we collected, only 265 comments had enough text to read.",
      },
    ],
    figures: [
      {
        value: 56, prefix: both("43–"), unit: both("%"),
        label: { vi: "người chưa đi xe điện tin xe điện dễ cháy hơn (Úc, Mỹ, Đức, Áo)", en: "of non-EV drivers believe EVs catch fire more (Australia, US, Germany, Austria)" },
        source: { name: { vi: "Đại học Queensland, Nature Energy 2025", en: "University of Queensland, Nature Energy 2025" }, url: "https://news.uq.edu.au/2025-06-conspiracy-mentality-drives-misinformation-about-evs" },
      },
      {
        value: 78, unit: both("%"),
        label: { vi: "người mua tin doanh nghiệp hơn khi thấy một phản hồi chu đáo dưới đánh giá tiêu cực (khảo sát ở Mỹ)", en: "of buyers trust a business more after a thoughtful reply to a negative review (US survey)" },
        source: { name: { vi: "LocalImpact, State of Online Reviews 2026", en: "LocalImpact, State of Online Reviews 2026" }, url: "https://www.webull.com/news/15270444108358656" },
      },
      {
        value: 265,
        label: { vi: "bình luận đủ nội dung để đọc, trong 3.081 lượt tương tác thu thập được", en: "comments with readable text, out of 3,081 interactions collected" },
        source: { name: { vi: "Dữ liệu của dự án", en: "Project dataset" }, url: "/insights" },
      },
    ],
  },
  {
    id: "built",
    tone: "exit",
    title: { vi: "Nên chúng tôi làm một trạm dừng trước khi đăng", en: "So we built a stop before you post" },
    body: [
      {
        vi: "Thử bài trước khi nó gặp khách thật: xem nó có khả năng lan truyền trên YouTube, X hay Reddit, đọc trước những bình luận khách sẽ viết, rồi tập trả lời chúng với một khách ảo cho tới khi trả lời được thật tự tin. Mọi con số trong câu trả lời gợi ý đều được đối chiếu với bảng thông số, để quảng cáo xanh thuyết phục bằng sự thật chứ không bằng con số tự bịa.",
        en: "Test a post before it meets real buyers: see how it is likely to travel on YouTube, X and Reddit, read the comments buyers will write before they write them, then practise answering a virtual customer until the answer comes easily. Every figure in a suggested answer is checked against the spec sheet, so green advertising persuades with facts, not invented numbers.",
      },
    ],
    figures: [
      {
        value: 53, unit: both("%"),
        label: { vi: "tuyên bố \"xanh\" trong quảng cáo ở EU mơ hồ, gây hiểu lầm hoặc không có căn cứ. Vì vậy công cụ kiểm từng con số trong bài", en: "of green claims in EU ads are vague, misleading or unfounded. That's why the tool checks every figure in a post" },
        source: { name: both("European Commission"), url: "https://environment.ec.europa.eu/topics/circular-economy/green-claims_en" },
      },
    ],
    exits: [
      { href: "/analyze", label: { vi: "Phân tích bài viết", en: "Analyse a post" }, sub: { vi: "Điểm lan truyền cho 3 mạng, mô hình học từ 58.020 bài", en: "A score for 3 networks, from a model trained on 58,020 posts" } },
      { href: "/coach", label: { vi: "Luyện trả lời khách", en: "Practise with a customer" }, sub: { vi: "Ba khách ảo dựa trên nỗi lo có thật", en: "Three virtual customers built from real worries" } },
      { href: "/analyze?mode=compare", label: { vi: "So sánh các phiên bản", en: "Compare versions" }, sub: { vi: "Đổi câu chữ, xem điểm thay đổi ra sao", en: "Change the wording, see how the score moves" } },
    ],
    note: {
      vi: "Số liệu ngoài dự án lấy từ các bài báo dẫn lại báo cáo gốc; bấm vào nguồn dưới mỗi con số để kiểm tra. Kiểm tra lần cuối ngày 24/11/2026.",
      en: "Outside figures come from news reports of the original studies; follow the source under each number to check it. Last checked 24 November 2026.",
    },
  },
];

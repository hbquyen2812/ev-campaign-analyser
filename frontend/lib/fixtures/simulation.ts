// Deterministic sample of /api/simulate output.
//
// Two jobs: it lets the UI be built and reviewed before the LLM route exists, and it
// is what the route falls back to when no LLM backend is reachable — so the public
// demo always has something to show instead of an error card.

import type { SimulationResponse } from "@/lib/types";

export const SIMULATION_FIXTURE: SimulationResponse = {
  backend: "template",
  comments: [
    {
      personaId: "tinh-toan",
      personaName: "Anh Tính Toán",
      comment: "Tiết kiệm 80% là so với cái gì vậy shop? Có tính tiền thay pin chưa?",
      reaction: "skeptical",
      risk: 0.82,
      suggestedReply:
        "Dạ 80% là so tiền điện với tiền xăng ạ. Tiền điện mỗi lần sạc đầy khoảng 4.500 đ (số minh hoạ), còn thay pin khoảng 12.000.000 đ (số minh hoạ) sau khi hết bảo hành 3 năm ạ.",
    },
    {
      personaId: "tinh-toan",
      personaName: "Anh Tính Toán",
      comment: "Giá lăn bánh bao nhiêu, đã gồm pin chưa?",
      reaction: "skeptical",
      risk: 0.55,
      suggestedReply:
        "Dạ giá 35.000.000 đ đã gồm pin ạ (số minh hoạ). Nếu anh chọn thuê pin thì 350.000 đ/tháng ạ.",
    },
    {
      personaId: "tinh-toan",
      personaName: "Anh Tính Toán",
      comment: "Chạy 3 năm rồi bán lại thì được mấy đồng? Xe điện mất giá nhanh lắm.",
      reaction: "negative",
      risk: 0.61,
      suggestedReply:
        "Dạ em không có số liệu giá bán lại nên không dám nói bừa ạ. Em gửi anh bảng bảo hành pin 3 năm (số minh hoạ) để anh tính giúp em ạ.",
    },
    {
      personaId: "lo-ngap",
      personaName: "Chị Lo Ngập",
      comment: "Mùa mưa đường ngập tới nửa bánh xe, xe này đi qua có hỏng không em?",
      reaction: "skeptical",
      risk: 0.88,
      suggestedReply:
        "Dạ xe lội nước tối đa 30 cm (số minh hoạ), chuẩn chống nước IP67 ạ. Sâu hơn mức đó chị nên dắt bộ, em nói thật để chị không gặp rủi ro ạ.",
    },
    {
      personaId: "lo-ngap",
      personaName: "Chị Lo Ngập",
      comment: "Đọc báo thấy cháy pin suốt. Sạc qua đêm trong nhà có sao không em?",
      reaction: "negative",
      risk: 0.79,
      suggestedReply:
        "Dạ chị sạc ở nơi thoáng, không che kín, và rút sạc khi đầy ạ. Thời gian sạc đầy khoảng 6 giờ (số minh hoạ) nên chị canh được, không cần cắm cả đêm ạ.",
    },
    {
      personaId: "lo-ngap",
      personaName: "Chị Lo Ngập",
      comment: "Chở con đi học mỗi ngày mà hỏng giữa đường thì khổ lắm.",
      reaction: "skeptical",
      risk: 0.5,
      suggestedReply:
        "Dạ em hiểu lo lắng của chị ạ. Quãng đường mỗi lần sạc 120 km (số minh hoạ), chị đi học về trong thành phố thì dư ạ.",
    },
    {
      personaId: "sinh-vien",
      personaName: "Bạn Sinh Viên",
      comment: "Mình ở trọ, chủ không cho sạc trong phòng. Vậy sạc ở đâu bạn?",
      reaction: "skeptical",
      risk: 0.74,
      suggestedReply:
        "Hiện có 150 điểm sạc công cộng (số minh hoạ) bạn nhé. Bạn cho mình biết khu trọ, mình gửi danh sách điểm gần nhất ạ.",
    },
    {
      personaId: "sinh-vien",
      personaName: "Bạn Sinh Viên",
      comment: "Mỗi ngày mình chạy 10 km thì mấy ngày phải sạc một lần?",
      reaction: "positive",
      risk: 0.18,
      suggestedReply:
        "Quãng đường mỗi lần sạc là 120 km (số minh hoạ), bạn chạy 10 km/ngày thì khoảng hơn một tuần mới sạc lại ạ.",
    },
    {
      personaId: "sinh-vien",
      personaName: "Bạn Sinh Viên",
      comment: "Có trả góp cho sinh viên không bạn? Mình không có đủ một lúc.",
      reaction: "positive",
      risk: 0.2,
      suggestedReply:
        "Dạ bên mình có hỗ trợ trả góp ạ. Bạn để lại số điện thoại, mình gửi mức trả hằng tháng cụ thể cho bạn nhé.",
    },
    {
      personaId: "sinh-vien",
      personaName: "Bạn Sinh Viên",
      comment: "Xe nhìn ổn áp đó, mà pin dùng được bao lâu thì chai?",
      reaction: "skeptical",
      risk: 0.46,
      suggestedReply:
        "Dạ pin được bảo hành 3 năm (số minh hoạ) ạ. Mức chai pin thực tế còn tuỳ cách sạc, em không có số chính xác nên không dám nói bừa ạ.",
    },
  ],
  mix: { positive: 20, skeptical: 60, negative: 20 },
  topRisk: null,
};

// Keep the headline card and the list in sync without hand-maintaining two copies.
SIMULATION_FIXTURE.topRisk = SIMULATION_FIXTURE.comments.reduce(
  (worst, c) => (worst === null || c.risk > worst.risk ? c : worst),
  SIMULATION_FIXTURE.comments[0] ?? null,
);

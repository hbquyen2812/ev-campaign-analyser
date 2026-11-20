# Khai báo phần đã có trước và phần làm mới cho Smart City 2026

> Đội: EV Campaign Analyser · Lập ngày 20/11/2026
> Mốc phân định: commit `eb5fd14` (06/11/2026) là trạng thái sản phẩm **trước** cuộc thi.
> Mọi commit từ `b0fb982` (19/11/2026) trở đi là phần làm mới cho cuộc thi.
> Repo: https://github.com/hbquyen2812/ev-campaign-analyser

Thể lệ cho phép dự thi bằng sản phẩm đã có từ trước, với điều kiện khai báo đầy đủ
phần cải tiến. Bảng dưới đây liệt kê đúng ranh giới đó.

---

## 1. Phần đã có trước cuộc thi

Những hạng mục này hoàn thành trước ngày 06/11/2026, không tính vào phần dự thi.

| Hạng mục | Mô tả | Nằm ở đâu |
|---|---|---|
| Pipeline dữ liệu | Thu thập YouTube / X / Reddit qua Kafka, làm sạch và ẩn danh bằng Spark, lưu vào Iceberg trên MinIO, điều phối bằng Airflow | `spark/`, `playwright/`, `orchestrator/`, `common/` |
| Mô hình dự đoán lan truyền | XGBoost kết hợp đặc trưng nội dung, chủ đề và vai trò tu từ; giải thích bằng SHAP | `ml/` |
| Dịch vụ dự đoán | API FastAPI bọc quanh mô hình trên | `ml/server/` |
| Giao diện phân tích | Web Next.js: nhập bài đăng, chấm điểm lan truyền trên ba nền tảng, báo cáo marketing song ngữ, lịch sử, so sánh biến thể | `frontend/` (bản nhập ngày 06/11) |
| Dashboard vận hành | Streamlit theo dõi tình trạng pipeline | `dashboard/` |

Tương ứng với **mục ① "Khả năng viral"** trong màn hình kết quả.

---

## 2. Phần làm mới cho Smart City 2026

Toàn bộ do đội thực hiện từ 19/11/2026. **28 file, khoảng 2.759 dòng**, kèm **87 bài
kiểm thử tự động**.

### 2.1. Người dùng ảo dựng từ dữ liệu thật

Ba chân dung khách hàng, mỗi chân dung kèm trích dẫn nguyên văn và mã truy ngược
về đúng dòng dữ liệu gốc.

- Nguồn: **3.081 bình luận** thật trong `lakehouse.silver.interactions` (Reddit, X),
  trong đó **265 bình luận có nội dung dùng được**; cộng **1.043 bài đăng tiếng Việt**
  trong `annotation_marketing/`.
- Mỗi trích dẫn lưu kèm `interaction_id` hoặc `post_id`, nên kiểm chứng lại được.
- Có bài kiểm thử bắt buộc mỗi chân dung phải có ít nhất một bình luận thật.

Commit: `b0fb982`, `7c29212` · File: `frontend/lib/personas/`

### 2.2. Đoán trước bình luận (mục ② ③ ④)

Dán bài đăng vào, hệ thống cho ba chân dung đọc rồi viết bình luận như người thật.

- **②** Tỷ lệ khen / nghi ngờ / chê — **đếm bằng mã nguồn** từ các bình luận sinh ra,
  không hỏi mô hình ngôn ngữ, nên luôn cộng đủ 100%.
- **③** Bình luận đáng lo nhất — câu không phải lời khen có khả năng bị hùa theo cao nhất.
- **④** Mười bình luận, mỗi câu kèm một khung trả lời gợi ý.
- Đo thực tế: 5,9 giây mỗi lần, chi phí khoảng 0,0008 USD.

Commit: `f90fe4b`, `a58883c` · File: `frontend/lib/simulate.ts`, `frontend/app/AudiencePanel.tsx`

### 2.3. Luyện trả lời khách và thanh tin tưởng

Trang riêng, dùng lại đúng ba chân dung trên. Khách ảo hỏi, nhân viên trả lời, mức
tin tưởng thay đổi sau mỗi câu.

- **Mô hình ngôn ngữ chỉ gán nhãn theo tiêu chí cố định** (có số liệu, nói rõ giới hạn,
  đồng cảm / chung chung, nói quá, gạt đi, ép mua). **Phần trăm do công thức trong mã
  nguồn tính**: +12 cho tiêu chí khách quan tâm, +6 cho tiêu chí khác, −5 mỗi lỗi,
  −8 mỗi con số bịa. Nhờ vậy cùng một câu trả lời luôn cho cùng một kết quả, và giải
  thích được cho người học.
- Hệ số hiệu chỉnh theo ví dụ trong kế hoạch: 30% → 25% khi trả lời chung chung,
  lên 55% khi trả lời có số liệu và thừa nhận giới hạn.

Commit: `547a8bc`, `2de45e5` · File: `frontend/lib/coach.ts`, `frontend/app/coach/`

### 2.4. Bộ chặn bịa số liệu

Mọi câu hướng tới khách hàng đều bị quét: con số không có trong bảng thông số sẽ bị
xoá và báo rõ.

- So sánh theo **họ đơn vị** và **song ngữ**: "35 triệu" khớp "35.000.000 đ",
  "3 năm" khớp "3 years", nhưng "3 m" không bao giờ khớp "3 năm".
- Câu trả lời mẫu **không chứa con số nào**, chỉ có ô trống dạng `[mức lội nước, cm]`
  để nhân viên tự điền từ bảng thông số thật của doanh nghiệp.
- Người học cũng bị soi như vậy: nói "bảo hành 8 năm" khi bảng ghi 3 năm thì bị gọi tên
  và trừ điểm nặng hơn cả trả lời chung chung.

Commit: `b0fb982`, `5656121`, `6e23be8` · File: `frontend/lib/numeric-guard.ts`

### 2.5. Các sửa lỗi phát hiện trong quá trình làm

| Lỗi | Hệ quả nếu không sửa | Commit |
|---|---|---|
| Ngưỡng quyết định chép cứng 0.5 ở sáu chỗ, mô hình thật dùng 0.25 | Màn hình gắn nhãn "có khả năng lan truyền" cho bài 39% ngay cạnh chú thích ghi ngưỡng 0.5 | `e2c1347` |
| Ba thẻ gọi endpoint chưa từng tồn tại | Ba ô báo lỗi đỏ ngay dưới điểm số | `0c41a80` |
| Chấm điểm thưởng cả khi nhân viên hùa theo con số sai của khách | Nhắc lại tin đồn vẫn được +12 | `de710b9` |
| Bộ chặn số chỉ biết đơn vị tiếng Việt | "covered for 8 years" lọt lưới hoàn toàn | `f90fe4b` |

---

## 3. Hạn chế đã biết

Khai báo thẳng, không giấu.

- **Mười con số trong bảng thông số là số minh hoạ**, chưa đối chiếu thông số nhà sản
  xuất. Giao diện hiển thị rõ dòng ghi chú này. Thay bằng số thật là dùng được ngay.
- **Phần trăm tin tưởng là ước lượng theo thang điểm tự đặt**, không phải đo lường tâm lý.
- **Mô hình dự đoán lan truyền (mục ①) hiện dùng đặc trưng lượng người theo dõi**, trong
  khi chính bộ kiểm thử của dự án quy định không được dùng, vì giá trị này thu thập sau
  thời điểm đăng bài nên không chứng minh được nó có trước. Phát hiện ngày 20/11, cần
  huấn luyện lại. Không ảnh hưởng tới các mục ② ③ ④.
- **Bình luận thật dùng để dựng chân dung phần lớn là tiếng Anh** (Reddit, X). Nỗi lo
  đường ngập và sạc xe ở nhà trọ là đặc thù Việt Nam, lấy dẫn chứng từ bài đăng tiếng
  Việt và khảo sát sinh viên.

---

## 4. Cách kiểm chứng

```
git log --oneline eb5fd14..main
```

Liệt kê đúng toàn bộ phần làm mới. Mỗi commit có phần mô tả ghi rõ vấn đề gặp phải,
cách xử lý và kết quả đo được.

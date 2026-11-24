# Hướng dẫn deploy — EV Campaign Analyser

> Cập nhật 21/11/2026. Viết cho người chưa từng động vào dự án này.
> Repo: https://github.com/hbquyen2812/ev-campaign-analyser

---

## 1. Hệ thống gồqm hai phần tách rời

| Phần | Là gì | Cần gì để chạy | Trạng thái |
|---|---|---|---|
| **Web** (`frontend/`) | Next.js. Toàn bộ giao diện, cộng các tính năng mới của cuộc thi | Node + khoá OpenAI | **Đã deploy trên Vercel** |
| **API dự đoán** (`ml/`) | FastAPI + mô hình XGBoost | Python + 4 file model | **Chưa deploy** |

Hai phần này **không phụ thuộc nhau khi chạy**. Web vẫn hoạt động khi API chết; chỉ mất phần điểm viral.

### Phần nào cần API, phần nào không

**Chạy được mà không cần API dự đoán** — gọi thẳng OpenAI từ máy chủ web:

- Mục ② Tỷ lệ phản ứng
- Mục ③ Bình luận cần lo nhất
- Mục ④ Mười bình luận dự đoán kèm gợi ý trả lời
- Trang Luyện tập trả lời khách + thanh tin tưởng

Đây là **toàn bộ phần làm mới cho cuộc thi**.

**Cần API dự đoán:**

- Mục ① Khả năng viral — vòng tròn phần trăm, nhãn, biểu đồ yếu tố SHAP
- So sánh ba mạng YouTube / X / Reddit
- Báo cáo marketing (nó viết *từ* kết quả dự đoán)
- Toàn bộ trang **Variant lab**

Đây là phần đã có trước cuộc thi.

---

## 2. Phần web — đã xong, chỉ cần biết cách cập nhật

Project Vercel: `ev-campaign-analyser`, deploy bằng CLI từ máy, **chưa nối GitHub**
(repo thuộc tài khoản `hbquyen2812`, Vercel của người deploy không thấy được).

Hệ quả: **không tự deploy khi push**. Mỗi lần code mới vào `main` phải làm tay:

```powershell
cd D:\ev-campaign-analyser
git checkout main
git pull
cd frontend
vercel --prod
```

### Biến môi trường đã đặt trên Vercel

| Biến | Giá trị | Ghi chú |
|---|---|---|
| `OPENAI_API_KEY` | khoá OpenAI | Đặt kiểu **Secret**, không xem lại được. Mất thì tạo khoá mới. |

Thêm biến mới:

```powershell
vercel env add TEN_BIEN production
vercel --prod
```

Phải chạy lại `vercel --prod` thì biến mới có hiệu lực.

### Nếu muốn tự động deploy khi push

Chủ repo (Quyên) cài https://github.com/apps/vercel vào tài khoản của mình và cấp
quyền cho repo `ev-campaign-analyser`, rồi nối Git vào project trong phần Settings.
Không bắt buộc — chỉ tiện hơn.

---

## 3. Phần API dự đoán — việc cần làm

Mã nguồn nằm ở `ml/`. Có sẵn `ml/server/Dockerfile`.

### 3.1. Bốn file model không nằm trong repo

Chúng bị gitignore **có chủ đích**. Lý do ghi trong
`tests/scripts/test_serve_train_parity.py`: bộ kiểm thử này bỏ qua khi không có model
và chạy khi có, và nó **đang không qua** với các file hiện tại — mô hình chính thức bị
ràng buộc không được dùng đặc trưng lượng người theo dõi, nhưng các file được bàn giao
lại có. Commit model vào repo biến một bài kiểm tra đang ngủ thành CI đỏ.

Bốn file máy chủ cần nạp:

```
stage1_multisource.joblib               (mô hình mặc định)
stage1_multisource_audience_x90.joblib  (mô hình thứ hai trong ô chọn)
topic_model.joblib                      (trích đặc trưng chủ đề)
rhetorical_role.joblib                  (trích vai trò tu từ)
```

Xin từ người giữ bản backup, đặt vào `ml/models/`. Tổng 5,5 MB.

### 3.2. Phải hạ xgboost xuống 3.0.5

`ml/requirements-train.txt` đã ghim sẵn. **Đừng nâng lên 3.3.0** — bản đó không đọc được
các file model này và báo `XGBoostError: input stream corrupted`. Lỗi xảy ra **lúc chạy,
không phải lúc build**, nên container lên khoẻ rồi chết ở lần dự đoán đầu tiên.

Đã thử: 3.0.5, 2.1.4, 2.0.3 đều đọc được. Chỉ 3.3.0 là không.

### 3.3. Chuỗi phụ thuộc ẩn — chỗ dễ sập nhất

`serve/explain_viral.py` kéo theo một dây dài:

```
explain_viral → train.train_viral → grouped_cv_stage1 → common.reproducibility → dataset_lineage
```

Thiếu bất kỳ mắt xích nào thì **Docker build vẫn thành công**, container khởi động bình
thường, rồi 500 ở lần gọi `/predict` đầu. Tệ hơn nữa, `train_viral.py` bọc import trong
`try/except ImportError` nên lỗi gốc bị nuốt và chỉ hiện ra một thông báo sai chỗ.

Image phải chứa, ngoài `server/` và `serve/`:

```
features/  preprocess/  train/  common/  report_ui/
và các file .py ở gốc ml/ (dataset_lineage.py, virality_lineage.py, role_contract.py, ...)
```

Cách kiểm tra trước khi tốn công build:

```powershell
cd <thu-muc-se-dong-goi>
python -c "import sys; sys.path.insert(0,'.'); from serve.explain_viral import ViralExplainer; print(ViralExplainer().explain('test','youtube',None)['label'])"
```

In ra `viral-likely` hoặc `not-viral` là đủ module.

### 3.4. Cổng do máy chủ quyết định

`ml/server/Dockerfile` đã sửa để nghe theo biến `$PORT`, mặc định 8000. Hugging Face
Spaces dùng 7860; Render và Railway tự bơm `$PORT`. Không cần sửa gì thêm.

### 3.5. Chọn chỗ deploy

| Nơi | Tiền | Nhận xét |
|---|---|---|
| **Render** (free) | 0đ | 512 MB RAM — server đo được **306 MB**, vừa. Ngủ sau 15 phút, dậy mất ~1 phút. **750 giờ/tháng tính chung cả tài khoản**, vượt là mọi service free bị treo. |
| Hugging Face Spaces | **Đã thành trả phí** | SDK Docker không còn miễn phí. |
| Railway | ~$5/tháng | Không ngủ. |
| Máy cá nhân + Tailscale Funnel | 0đ | Tác giả gốc từng làm vậy. Nhanh nhất, nhưng máy phải thức suốt đợt chấm 25–30/11. |

**Khuyến nghị: Render.** Nếu dùng Render thì **đừng cài ping tự động giữ máy thức** — nó
ăn hết quota 750 giờ và kéo theo các service khác trong tài khoản bị treo. Chỉ cần vào
bấm một cái trước đợt chấm cho nó dậy.

### 3.6. Các bước trên Render

Render deploy từ Git. Repo chính thuộc người khác nên cách gọn nhất là **tạo một repo
riêng cho API**:

1. Tạo repo mới trên GitHub, đặt gì cũng được, ví dụ `ev-campaign-analyser-api`.
2. Chép vào đó: nội dung thư mục `ml/` (trừ `.venv`, `notebooks`, `kaggle`, `results`),
   thêm thư mục `common/` từ gốc dự án, và đặt `ml/server/Dockerfile` ra gốc repo thành
   `Dockerfile`. Nhớ chép cả 4 file model vào `models/`.
3. Chạy lệnh kiểm tra ở mục 3.3 trước khi push.
4. Render → **New** → **Web Service** → chọn repo đó.
   - Runtime: **Docker**
   - Instance Type: **Free**
   - Environment Variable: `AI_SERVER_TOKEN` = một chuỗi ngẫu nhiên dài tự đặt
5. Build mất 5–8 phút (cài pandas, scikit-learn, xgboost).

Kiểm tra:

```powershell
Invoke-RestMethod https://<ten-service>.onrender.com/health
```

Thấy `models.legacy.available: True` là đạt. `loaded: false` vẫn bình thường — mô hình
nạp lười, chỉ bật lên ở lần dự đoán đầu.

### 3.7. Nối API vào web

```powershell
cd D:\ev-campaign-analyser\frontend
vercel env add AI_SERVER_URL production
vercel env add AI_SERVER_TOKEN production
vercel --prod
```

- `AI_SERVER_URL`: địa chỉ Render, **không có dấu `/` ở cuối**
- `AI_SERVER_TOKEN`: **giống hệt** chuỗi đặt ở bước 4

Đặt token là bắt buộc. `ml/server/app.py` chỉ kiểm tra token khi biến này có giá trị —
bỏ trống nghĩa là ai tìm ra địa chỉ cũng gọi được mô hình.

---

## 4. Kiểm tra sau khi deploy

Mở **cửa sổ ẩn danh** — thể lệ bắt buộc link phải mở được với người lạ.

| Kiểm tra | Mong đợi |
|---|---|
| Mở trang chủ | Hiện bình thường, có CSS |
| `/analyze`, dán bài, bấm Analyze | Sau ~6 giây hiện khung "Phản ứng dự đoán của người xem" với 10 bình luận tiếng Việt |
| Khung đó **không** có dòng "đây là kết quả mẫu" | Nếu có, nghĩa là `OPENAI_API_KEY` chưa tới nơi |
| `/coach`, chọn khách, trả lời một câu | Thanh tin tưởng nhúc nhích, có nhận xét |
| Mở trên điện thoại | Bố cục không vỡ |
| Vòng tròn % viral ở `/analyze` | Có số nếu đã deploy API; báo lỗi nếu chưa — **không làm hỏng các phần khác** |

---

## 5. Chặn đốt tiền OpenAI

Đã có hai lớp, **cả hai đều đang bật**:

1. **Trần chi tiêu $2/tháng** trong tài khoản OpenAI, bật chế độ cưỡng chế. Vượt là mọi
   lời gọi trả về 429.
2. **Giới hạn trong code** (`frontend/lib/rate-limit.ts`): 10 lần/phút mỗi địa chỉ IP,
   200 lần/giờ toàn hệ thống, tính **trước khi** gọi tới mô hình.

Chi phí đo được: **~0,0008 USD mỗi lần phân tích**. $2 đủ cho khoảng 2.500 lần.

Chạm trần thì web **không sập**: nó hiện bộ bình luận mẫu kèm dòng cảnh báo.

Sau khi thi xong nên thu hồi khoá OpenAI — trần $2 là theo tháng và lặp lại, nên một
endpoint công khai bị bỏ quên vẫn tiêu tiền đều.

---

## 6. Những cái bẫy đã gặp

| Hiện tượng | Nguyên nhân |
|---|---|
| Web mất sạch CSS, hoặc lỗi 500 `Cannot find module './948.js'` | Chạy `npm run build` khi `npm run dev` đang bật. Hai lệnh cùng ghi vào `.next`. Tắt dev, xoá `.next`, chạy lại. |
| Sửa `.env.local` mà không thấy tác dụng | Next.js chỉ đọc file đó lúc khởi động. Phải tắt dev server rồi bật lại. |
| `/predict` trả 503 | Thiếu file model trong `ml/models/`. |
| `XGBoostError: input stream corrupted` | xgboost 3.3.0. Hạ xuống 3.0.5. |
| CI đỏ ở job `e2e`, log ghi `no space left on device` | Máy chạy CI hết đĩa khi build MinIO. Đã có bước dọn đĩa trong `validation.yml`. |
| CI đỏ ở `static-unit`, `test_serve_train_parity` | File model lọt vào repo. Chúng phải nằm ngoài. |
| Đổi nhánh git xong thấy mất file model | Chúng chỉ tồn tại trên đĩa, không trong git. Chép lại từ backup. |

---

## 7. Chạy tại máy để thử

Hai cửa sổ.

**Cửa sổ 1 — API dự đoán** (bỏ qua nếu chỉ xem phần mới):

```powershell
cd D:\ev-campaign-analyser
.\ml\.venv\Scripts\python.exe -m uvicorn server.app:app --app-dir .\ml --host 127.0.0.1 --port 8000
```

**Cửa sổ 2 — web:**

```powershell
cd D:\ev-campaign-analyser\frontend
npm run dev
```

Mở http://localhost:3000

Dựng môi trường lần đầu trên máy mới:

```powershell
cd D:\ev-campaign-analyser\ml
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-train.txt -r server\requirements.txt
cd ..\frontend
npm ci
```

Chép `frontend/.env.local.example` thành `frontend/.env.local` rồi điền `OPENAI_API_KEY`.

Bốn lệnh phải xanh trước khi push:

```powershell
cd D:\ev-campaign-analyser\frontend
npm test
npm run typecheck
npm run check:i18n
npm run build
```

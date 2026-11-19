EV Campaign Analyser: dự án từ đầu đến cuối
PHẦN 1. NHÌN CHUNG
Dự án làm gì
Một trang web giúp hãng xe điện và người bán xe biết trước người ta sẽ phản ứng thế nào, để chuẩn bị câu trả lời cho tốt.
Hiện có gì
Một trang web: dán bài đăng vào, web đoán bài có viral hay không.
Hàng nghìn bình luận thật về xe điện, lấy từ YouTube, X và Reddit.
Sẽ thêm gì
Người dùng ảo: AI đóng vai các kiểu người hay gặp trong bình luận thật.
Đoán trước bình luận: dán bài vào, web cho thấy người xem sẽ bình luận gì, kèm câu trả lời gợi ý.
Luyện tập trả lời khách: nhân viên bán xe chat thử với khách ảo trước khi gặp khách thật.
Vì sao hợp cuộc thi
Cuộc thi nói về đô thị xanh, trong đó có giao thông xanh. Người dân còn ngại xe điện vì nhiều thắc mắc chưa ai trả lời rõ: pin, sạc, đường ngập. Web này giúp trả lời đúng những thắc mắc đó, nên giúp nhiều người chuyển sang xe điện hơn.
Ai làm gì
Đạt, Đức: viết code.
Quyên: dùng thử để tìm lỗi, làm slide, quay video.
Hà: làm slide, viết thuyết minh, đăng ký, khảo sát.
Thời gian
Làm trong 4 ngày, từ hôm nay 16/11 đến 19/11. Nộp ngày 20/11. Hạn chót của cuộc thi là 24 giờ ngày 24/11.
PHẦN 2. CHI TIẾT
2.1. Người dùng ảo
Là gì. Đọc bình luận thật sẽ thấy vài kiểu người lặp đi lặp lại. Nhóm viết mô tả cho từng kiểu, rồi bảo AI đóng vai kiểu người đó. Giống như gõ vào ChatGPT “hãy đóng vai một ông chú khó tính”, chỉ khác là vai được viết từ bình luận thật.
Ba người đầu tiên:
Anh Tính Toán: chỉ quan tâm tiền. Hay hỏi giá pin, 5 năm tốn bao nhiêu.
Chị Lo Ngập: sợ xe hỏng khi đi đường ngập, mưa lớn.
Bạn Sinh Viên: ở trọ, không biết sạc xe ở đâu.
Nếu kịp thì thêm Người Hoài Nghi (không tin xe điện xanh thật) và Fan Công Nghệ (thích hỏi tính năng).
Một bản mô tả trông thế này:
Anh Tính Toán: khoảng 35 tuổi, đang đi xe xăng. Quan tâm nhất là tiền. Nói ngắn, hay hỏi con số. Không tin quảng cáo chung chung. Bình luận thật làm mẫu: “Thay pin hết bao nhiêu?”, “Tính ra có rẻ hơn xăng không?”
2.2. Chức năng đoán trước bình luận
Người dùng làm gì. Dán bài định đăng vào ô, bấm nút “Kiểm tra”.
Web làm gì ở phía sau. Web gửi bài cho AI, kèm bản mô tả của Anh Tính Toán, và bảo: “Bạn là người này, hãy viết bình luận dưới bài này.” Rồi làm lại với Chị Lo Ngập, với Bạn Sinh Viên. Gom lại được khoảng 10 bình luận.
Người dùng thấy gì trên màn hình:
① KHẢ NĂNG VIRAL: Cao                       (đã có sẵn)

② PHẢN ỨNG DỰ ĐOÁN
   Khen 55%  |  Nghi ngờ 30%  |  Chê 15%

③ BÌNH LUẬN CẦN LO NHẤT
   "200 km là đi đường bằng, không chở ai đúng không ad?"

④ CÁC BÌNH LUẬN DỰ ĐOÁN
   Anh Tính Toán: "Tiết kiệm 80% có tính tiền thay pin không?"
     → Gợi ý trả lời: "Dạ 80% là tính tiền điện so với tiền xăng ạ..."
   Chị Lo Ngập: "Xe đi đường ngập được không em?"
     → Gợi ý trả lời: "Dạ xe đi được qua đoạn ngập khoảng ... cm ạ..."
   (và các bình luận khác)

⑤ NÊN SỬA TRONG BÀI
   "đi 200 km" → "đi 200 km trong điều kiện tiêu chuẩn"
① là cái web đang có, giữ nguyên.
② là đếm trong 10 bình luận có mấy câu khen, mấy câu nghi ngờ, mấy câu chê.
③ là câu chê dễ được nhiều người đồng tình nhất, cần trả lời trước.
④ là 10 bình luận, mỗi câu có sẵn một câu trả lời gợi ý.
⑤ là câu nào trong bài dễ bị bắt bẻ và nên viết lại thế nào.
Các con số ở trên chỉ là ví dụ.
2.3. Chức năng luyện tập trả lời khách
Đây là một trang riêng trên web, dùng lại đúng ba người dùng ảo ở trên.
Người dùng làm gì. Nhân viên bán xe chọn một khách ảo, ví dụ Chị Lo Ngập. Khách ảo hỏi trước, nhân viên gõ câu trả lời, khách ảo hỏi tiếp.
Ví dụ:
Chị Lo Ngập: “Mùa mưa đường ngập tới nửa bánh xe, xe điện đi qua có hỏng không em?”
 Nhân viên: “Dạ chị yên tâm, xe chạy tốt lắm ạ.”
 → Mức tin tưởng giảm từ 30% xuống 25%. Web nhận xét: trả lời chung chung, không có con số.
Nhân viên thử lại: “Dạ xe đi được qua đoạn ngập khoảng ... cm, sâu hơn thì chị nên dắt bộ. Pin bảo hành ... năm ạ.”
 → Mức tin tưởng tăng lên 60%. Web nhận xét: có con số, nói thật về giới hạn.
Người dùng thấy gì trên màn hình:
Khung chat với khách ảo.
Một thanh phần trăm cho biết khách đang tin mình bao nhiêu, lên xuống sau mỗi câu.
Nhận xét ngắn: câu vừa rồi hay ở đâu, dở ở đâu.
Một câu trả lời mẫu để học theo.
2.4. Bảng thông tin sản phẩm
Một bảng nhỏ ghi giá xe, quãng đường, bảo hành pin, giá thuê pin. Khi AI viết câu trả lời gợi ý, nó chỉ được lấy số từ bảng này. Không có bảng thì AI sẽ tự bịa số, và đó là lỗi nặng nhất khi demo. Số nào chưa có thật thì ghi “minh họa”.
2.5. Khảo sát sinh viên
Giám khảo sẽ hỏi: “Sao biết người dùng ảo giống người thật?” Để trả lời, nhóm làm một Google Form gửi 30–50 sinh viên, hỏi: “Nếu mua xe máy điện, bạn lo gì nhất?” và “Bạn sẽ hỏi người bán câu gì đầu tiên?”
Sau đó so với người dùng ảo. Nếu sinh viên thật cũng lo về pin, chỗ sạc, đường ngập thì nhóm có bằng chứng. Trùng bao nhiêu thì ghi đúng bấy nhiêu.
2.6. Cách ghi điểm theo từng tiêu chí
Phù hợp chủ đề và khả thi (35%): xe điện là giao thông xanh. Câu hỏi về đường ngập, ở trọ là chuyện của đô thị. Dữ liệu đã có sẵn, web đã có sẵn, không cần mua thiết bị.
Tính mới (25%): người dùng ảo làm từ bình luận thật. Thanh tin tưởng thay đổi theo từng câu trả lời. Web không chỉ nói “viral hay không” mà nói cả “người ta sẽ nói gì”.
Sản phẩm chạy được (25%): một link web mở lên dùng được ngay.
Trình bày (15%): slide, video 2–3 phút.
2.7. Việc của từng người
Đức (code: dữ liệu và giao diện)
Hôm nay đến trưa 17/11: dọn dữ liệu bình luận (xóa tên tài khoản, link), đếm có bao nhiêu bình luận, viết mô tả cho 3 người dùng ảo.
Tối 17/11: làm bảng thông tin sản phẩm.
18/11: làm màn hình hiện 5 mục kết quả và màn hình chat.
Sáng 19/11: sửa lỗi Quyên báo.
Đạt (code: phần AI)
17/11: viết phần để AI đóng vai và sinh ra bình luận, tỷ lệ, bình luận cần lo nhất, câu trả lời gợi ý.
18/11: viết phần chat luyện tập và thanh tin tưởng. Đưa web lên mạng để có link. Đẩy code lên GitHub.
Sáng 19/11: sửa lỗi Quyên báo. Sau 12 giờ trưa không thêm gì mới nữa.
Quyên (tìm lỗi, slide, video)
17/11 đến 19/11: mỗi khi có bản mới thì dùng thử. Thử cả những trường hợp lạ: để trống, dán bài rất dài, mở trên điện thoại, xem AI có bịa số không. Thấy lỗi thì chụp ảnh gửi Đạt hoặc Đức.
Tối 18/11: chụp ảnh màn hình web để đưa vào slide.
19/11: thử lần cuối, làm đẹp slide cùng Hà, quay video 2–3 phút, đưa lên YouTube ở chế độ Unlisted.
Hà (slide, thuyết minh, đăng ký, khảo sát)
Hôm nay: hỏi giảng viên hướng dẫn, lấy mã trường, đăng ký trên cổng. Mở Google Form khảo sát và gửi đi ngay.
18/11: tổng hợp khảo sát. Viết nội dung slide và bản nháp thuyết minh.
19/11: hoàn thiện thuyết minh, xuất PDF. Viết lời cho video.
Phần đăng ký, khảo sát và thuyết minh là mình đề xuất giao cho Hà, nhóm đổi được.

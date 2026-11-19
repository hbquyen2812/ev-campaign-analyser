EV CAMPAIGN ANALYSER
Tổng quan dự án và định hướng phát triển ý tưởng mới
1. Giới thiệu dự án
EV Campaign Analyser là hệ thống ứng dụng AI, Machine Learning và Big Data để phân tích hành vi người dùng trên mạng xã hội, tập trung vào nội dung truyền thông và chiến dịch Marketing liên quan đến xe điện (Electric Vehicles – EV).
Dự án hướng đến việc hỗ trợ doanh nghiệp, đội ngũ Marketing và nhà nghiên cứu hiểu được cách người dùng tương tác với nội dung trên mạng xã hội, đồng thời dự đoán khả năng một bài đăng đạt mức tương tác cao trước khi được công bố.
Hệ thống khai thác dữ liệu từ ba nền tảng chính: YouTube, X (Twitter) và Reddit.
Các mục tiêu chính:
Thu thập và phân tích nội dung, bình luận, mức độ tương tác và xu hướng thảo luận về xe điện.
Dự đoán khả năng nội dung đạt mức tương tác cao (Virality Prediction).
Xác định những đặc điểm nội dung có ảnh hưởng đến kết quả dự đoán.
So sánh hiệu quả dự kiến của nội dung giữa các nền tảng mạng xã hội.
Hỗ trợ lựa chọn và điều chỉnh nội dung trước khi triển khai chiến dịch.
Tạo báo cáo phân tích và hỗ trợ ra quyết định dựa trên dữ liệu.
2. Kiến trúc và công nghệ sử dụng
Hệ thống gồm các thành phần chính:
Data Collection: Thu thập dữ liệu từ YouTube, X và Reddit.
Data Engineering: Kafka, Spark, Apache Iceberg và MinIO để xử lý, lưu trữ và quản lý dữ liệu.
Workflow Orchestration: Apache Airflow để điều phối các quy trình thu thập, xử lý và chuẩn bị dữ liệu.
Machine Learning: TF-IDF, Logistic Regression, NMF và XGBoost để trích xuất đặc trưng, phân tích chủ đề và dự đoán.
Explainable AI: Feature Contributions và SHAP để giải thích các yếu tố ảnh hưởng đến dự đoán.
AI Backend: FastAPI cung cấp các API dự đoán và báo cáo.
Frontend: Next.js xây dựng giao diện phân tích dành cho người dùng.
Operations Dashboard: Streamlit phục vụ giám sát dữ liệu và vận hành hệ thống.
Report Generation: Báo cáo theo Template và tích hợp Ollama tùy chọn.
Các thành phần được tích hợp trong cùng repository nhưng vẫn có thể chạy và triển khai độc lập.
3. Những chức năng đã thực hiện
3.1. Thu thập và xử lý dữ liệu đa nền tảng
Xây dựng các bộ thu thập nội dung từ YouTube, X và Reddit.
Thu thập bài đăng/video, bình luận, metadata, transcript và số liệu tương tác tùy theo nguồn.
Xây dựng pipeline Kafka – Spark – Iceberg – MinIO với các lớp Bronze, Silver và Gold.
Chuẩn hóa dữ liệu, kiểm tra schema, xử lý dữ liệu không hợp lệ và che thông tin cá nhân theo quy tắc.
Lưu lịch sử tương tác theo thời gian để phục vụ phân tích biến động.
Hỗ trợ phục hồi pipeline khi xảy ra lỗi và xử lý lại dữ liệu mà không tạo bản ghi trùng lặp.
Pipeline đã vượt qua kiểm thử End-to-End. Việc thu thập dữ liệu trực tuyến thực tế vẫn phụ thuộc vào API Key, session và cấu hình của từng nền tảng.
3.2. Phân tích dữ liệu và xây dựng Dataset
Xây dựng các bảng dữ liệu bài đăng, bình luận và thông tin tương tác.
Tổng hợp các đặc trưng nội dung, nền tảng và mức độ tương tác.
Trích xuất đặc trưng văn bản bằng TF-IDF và phân tích chủ đề bằng NMF.
Xây dựng dữ liệu phục vụ phân tích và huấn luyện mô hình.
Hỗ trợ xuất Dataset có phiên bản, lưu thông tin nguồn gốc và cấu hình thí nghiệm.
Sử dụng Airflow để điều phối các workflow xử lý dữ liệu và huấn luyện.
3.3. Stage 1 – Dự đoán trước khi đăng bài
Đây là chức năng AI chính đã được tích hợp vào ứng dụng.
Người dùng nhập một nội dung Marketing dự kiến đăng tải. Hệ thống sử dụng các đặc trưng văn bản, cấu trúc nội dung và nền tảng để dự đoán khả năng bài đăng đạt mức tương tác cao.
Các chức năng đã thực hiện:
Dự đoán mức độ lan truyền dựa trên mô hình XGBoost.
Hỗ trợ dự đoán cho YouTube, X và Reddit.
Sử dụng Probability Calibration và ngưỡng phân loại theo mô hình.
Giải thích các yếu tố ảnh hưởng đến kết quả dự đoán.
So sánh kết quả dự kiến trên nhiều nền tảng.
Đưa kết quả phân tích vào báo cáo hỗ trợ người dùng.
Mô hình lịch sử hiện có đã chạy suy luận thành công. Tuy nhiên, mô hình này chưa đáp ứng đầy đủ yêu cầu đánh giá chính thức của Dataset v3, nên cần tiếp tục huấn luyện và kiểm chứng trước khi công bố hiệu năng mới.
3.4. Stage 2 – Dự đoán sau khi đăng bài
Dự án đã có mã nguồn thử nghiệm cho hướng dự đoán dựa trên dữ liệu tương tác ban đầu.
Ý tưởng là sử dụng các quan sát trong 6 giờ đầu, kết hợp với kết quả Stage 1, để cập nhật dự đoán về khả năng lan truyền của bài đăng sau 24 giờ.
Hiện đã có phần xây dựng Dataset và Training thử nghiệm, nhưng chưa hoàn thiện thành chức năng trên Web/API và chưa có kết quả đánh giá chính thức theo quy trình mới.
3.5. Giao diện Web và các chức năng dành cho người dùng
Đã tích hợp ứng dụng Next.js với những chức năng chính:
Nhập nội dung Marketing để phân tích.
Dự đoán và so sánh kết quả giữa ba nền tảng.
Hiển thị các yếu tố ảnh hưởng đến kết quả.
Tạo báo cáo phân tích bằng tiếng Anh hoặc tiếng Việt.
Variant Lab: So sánh và xếp hạng nhiều phiên bản nội dung.
Lưu lịch sử phân tích trên trình duyệt.
Tìm kiếm, lọc, xem lại và xuất lịch sử ra CSV.
Giao diện hỗ trợ hai ngôn ngữ Anh – Việt.
Các luồng phân tích, tạo báo cáo, lịch sử và so sánh biến thể đã được kiểm tra thành công.
3.6. Dashboard quản lý dữ liệu và vận hành
Đã xây dựng Streamlit Dashboard để:
Theo dõi dữ liệu được thu thập từ các nền tảng.
Xem các bảng dữ liệu và kết quả phân tích.
Kiểm tra chất lượng dữ liệu.
Theo dõi hoạt động của pipeline.
Quản lý cấu hình thu thập và import dữ liệu.
Xem trạng thái hoạt động của các workflow Airflow.
4. Kết quả đã đạt được
Tính đến ngày 06/11/2026, dự án đã đạt được những kết quả kỹ thuật sau:
Tích hợp Frontend, AI Backend và Data Platform trong cùng repository.
Xây dựng được pipeline dữ liệu đa nền tảng có cơ chế kiểm tra lỗi, phục hồi và tránh trùng lặp.
Hoàn thiện cơ sở hạ tầng để xây dựng Dataset và đánh giá mô hình có khả năng tái lập.
Chạy thành công mô hình Machine Learning lịch sử để dự đoán nội dung.
Tích hợp các chức năng phân tích, so sánh biến thể và tạo báo cáo trên Web.
Hoàn thiện các API dự đoán đơn lẻ, dự đoán hàng loạt, kiểm tra trạng thái và tạo báo cáo.
Kiểm thử Frontend: 27 tests passed.
Kiểm thử API: 11 local unit tests passed.
Backend CI: 648 tests passed, 12 skipped.
Kiểm thử End-to-End cho Data Pipeline thành công.
Production Build của Frontend thành công.
Như vậy, hệ thống đã đạt mức Working Integrated Prototype: có nguyên mẫu tích hợp hoạt động với các chức năng cốt lõi, nhưng chưa phải sản phẩm sẵn sàng triển khai thương mại.
5. Những hạn chế và phần chưa hoàn thiện
Mặc dù đã có nền tảng tương đối đầy đủ, dự án vẫn còn một số vấn đề:
Về AI và Machine Learning:
Chưa hoàn thành thí nghiệm huấn luyện và đánh giá chính thức theo Dataset v3.
Cần kiểm chứng hiệu năng mô hình trên dữ liệu đủ lớn và có tính đại diện.
Stage 2 mới ở mức thử nghiệm, chưa tích hợp vào sản phẩm.
Chưa có cơ chế học từ phản hồi thực tế của người dùng để liên tục cải thiện chất lượng dự đoán.
Về chức năng phân tích:
Chưa triển khai Backend API cho Sentiment Analysis, Greenwashing Detection và Adoption Barrier Analysis.
Chưa hoàn thiện phân tích phản ứng người dùng sau khi chiến dịch được triển khai.
Chưa có quy trình khép kín từ phân tích, đề xuất, thực thi đến đánh giá và tối ưu chiến dịch.
Về sản phẩm:
Lịch sử phân tích chỉ được lưu trong trình duyệt, chưa có tài khoản và cơ sở dữ liệu tập trung.
Chưa có hệ thống quản lý chiến dịch Marketing đầy đủ.
Chưa triển khai và xác minh vận hành Production.
Chưa kiểm chứng thực tế khả năng tạo báo cáo bằng Ollama.
Chưa hỗ trợ quy trình tạo, lập lịch và theo dõi nội dung Marketing tự động.
6. Định hướng đề xuất ý tưởng mới
Dự án hiện đã có nền tảng thu thập dữ liệu, xử lý Big Data, dự đoán bằng Machine Learning và giao diện Web. Vì vậy, các thành viên có thể tập trung đề xuất ý tưởng mới ở cấp độ chức năng AI, phương pháp phân tích hoặc bài toán ứng dụng, thay vì xây dựng lại hệ thống từ đầu.
Một số hướng có thể nghiên cứu:
Marketing Content Optimization: Không chỉ dự đoán mà còn đề xuất cách điều chỉnh nội dung để cải thiện hiệu quả dự kiến.
AI Marketing Agent: Xây dựng AI Agent có khả năng phân tích yêu cầu chiến dịch, đề xuất nội dung, so sánh phương án và hỗ trợ lập kế hoạch.
Audience Sentiment & Barrier Analysis: Phân tích cảm xúc, mối quan tâm và những rào cản khiến người dùng chưa sẵn sàng sử dụng xe điện.
Greenwashing Detection: Phát hiện và đánh giá rủi ro của các tuyên bố môi trường trong nội dung truyền thông.
Real-time Campaign Monitoring: Theo dõi mức độ tương tác thực tế, phát hiện xu hướng bất thường và cảnh báo chiến dịch hoạt động kém hiệu quả.
Cross-platform Campaign Optimization: Đề xuất nội dung hoặc chiến lược phù hợp cho từng nền tảng mạng xã hội.
Multimodal Content Analysis: Mở rộng phân tích từ văn bản sang hình ảnh, video và âm thanh.
Explainable Recommendations: Chuyển từ việc chỉ giải thích kết quả dự đoán sang đưa ra các đề xuất cải thiện có căn cứ.
Đây là các hướng gợi ý để nhóm thảo luận, chưa phải những chức năng đã hoàn thành. Mỗi ý tưởng cần được đánh giá thêm về tính mới, nguồn dữ liệu, khả năng thực hiện và cách đo lường hiệu quả.
7. Mục tiêu thảo luận của nhóm
Dựa trên hệ thống hiện tại, mỗi thành viên có thể đề xuất một hoặc nhiều ý tưởng theo các câu hỏi:
Hệ thống hiện tại chưa giải quyết tốt vấn đề nào của người dùng hoặc doanh nghiệp?
Có thể tận dụng dữ liệu, mô hình và pipeline hiện có để phát triển chức năng gì mới?
AI hoặc Machine Learning đóng vai trò gì trong chức năng đề xuất?
Ý tưởng có điểm mới hoặc giá trị thực tế nào so với những công cụ hiện có?
Cần bổ sung dữ liệu, công nghệ hoặc phương pháp nghiên cứu nào?
Có thể kiểm chứng hiệu quả bằng những chỉ số hoặc thí nghiệm nào?
Mục tiêu tiếp theo: Phát triển EV Campaign Analyser từ một công cụ dự đoán và phân tích nội dung thành hệ thống AI hỗ trợ ra quyết định Marketing dựa trên dữ liệu, có khả năng đề xuất, theo dõi và cải thiện chiến dịch theo thời gian.

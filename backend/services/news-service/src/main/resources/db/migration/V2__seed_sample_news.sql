-- Dữ liệu mẫu cho news-service (dùng cho môi trường dev/demo).
-- Bài viết mẫu lấy cảm hứng cấu trúc từ trang báo điện tử: tiêu đề,
-- tóm tắt (lead), nội dung chi tiết, ảnh đại diện, tác giả và mốc thời gian đăng.

INSERT INTO `news_categories` (`id`, `code`, `name`, `description`, `created_at`)
VALUES
    ('40000000-0000-0000-0000-000000000001', 'NEWS', 'Tin ô tô',
     'Tin tức ô tô mới nhất từ các hãng xe, thị trường và cộng đồng.', '2026-01-05 02:00:00'),
    ('40000000-0000-0000-0000-000000000002', 'MAINTENANCE', 'Bảo dưỡng & sửa chữa',
     'Hướng dẫn bảo dưỡng, mẹo sửa chữa và kiểm định phương tiện.', '2026-01-05 02:00:00'),
    ('40000000-0000-0000-0000-000000000003', 'PROMOTION', 'Khuyến mãi',
     'Các chương trình ưu đãi, giảm giá dịch vụ tại AutoCare.', '2026-01-05 02:00:00'),
    ('40000000-0000-0000-0000-000000000004', 'TECH', 'Công nghệ & xe điện',
     'Công nghệ xe điện, hệ thống hỗ trợ lái và bảo dưỡng thông minh.', '2026-01-05 02:00:00')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `news_articles` (
    `id`, `category_id`, `slug`, `title`, `summary`, `content`, `thumbnail_url`,
    `author_name`, `author_id`, `status`, `is_featured`, `view_count`,
    `published_at`, `created_at`, `updated_at`
)
VALUES
    (
        '40000000-0000-0000-0000-000000000101',
        '40000000-0000-0000-0000-000000000004',
        'mang-luoi-nghien-cuu-toan-chau-a-thai-binh-duong',
        'GS Ngô Bảo Châu khởi xướng mạng lưới nghiên cứu toán châu Á - Thái Bình Dương',
        '12 viện nghiên cứu danh tiếng tham gia Mạng lưới Toán học châu Á - Thái Bình Dương, theo khởi xướng của GS Ngô Bảo Châu.',
        '<p>Thông tin do Viện Nghiên cứu cao cấp về Toán (VIASM) công bố, trước thềm Diễn đàn cấp cao kết nối mạng lưới các viện nghiên cứu toán học và ứng dụng khu vực châu Á - Thái Bình Dương (Asia-Pacific Mathematical Network - APMN).</p><p>Mạng lưới này được kỳ vọng tạo cầu nối giữa các trung tâm nghiên cứu xuất sắc, tăng cường chia sẻ nguồn lực, thúc đẩy trao đổi học thuật, xây dựng một hệ sinh thái toán học gắn kết và bền vững.</p><p>Dự kiến Viện Kavli về Vật lý và Toán học của vũ trụ, thuộc Đại học Tokyo, Nhật Bản, tham gia mạng lưới này trong thời gian tới. Hiện 12 viện, trung tâm của APMN gồm Viện Toán học Chennai, Viện Toán học Chern (Đại học Nankai), Viện Feishu, Viện Toán học cao cấp thuộc Viện Công nghệ Harbin, Viện Toán học trong Công nghiệp (Đại học Kyushu), Viện Nghiên cứu Toán học (Đại học Hồng Kông), Viện các Khoa học về Toán (Đại học Quốc gia Singapore), Trung tâm Khoa học Lý thuyết Đài Loan, Trung tâm Toán học Quốc tế Thâm Quyến, Viện Nghiên cứu Toán học Sydney, Trường Toán thuộc Viện Nghiên cứu cao cấp Hàn Quốc (KIAS) và Viện Nghiên cứu cao cấp về Toán (VIASM).</p><p>Tại diễn đàn lần này, các nhà toán học nổi tiếng cũng chia sẻ góc nhìn về mối quan hệ giữa toán học và AI, những cơ hội, thách thức mà AI đặt ra cho nghiên cứu toán học và vai trò của mạng lưới này trong sự phát triển của AI.</p>',
        'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=60',
        'Ban biên tập AutoCare',
        '10000000-0000-0000-0000-000000000001',
        'PUBLISHED',
        TRUE,
        128,
        '2026-11-26 05:08:00',
        '2026-11-26 04:50:00',
        '2026-11-26 05:08:00'
    ),
    (
        '40000000-0000-0000-0000-000000000102',
        '40000000-0000-0000-0000-000000000001',
        'xe-dien-vi-dong-bang-va-bai-tuyen-moi-nam-2026',
        'Xe điện Việt Nam bừng sáng với những mẫu xe mới được tung ra trong năm 2026',
        'Làn sóng xe điện tại Việt Nam tiếp tục mở rộng khi nhiều hãng xe trong nước tung ra mẫu xe mới với mức giá thu hẹp khoảng cách với xe chạy xăng.',
        '<p>Thị trường ô tô điện Việt Nam trong năm 2026 ghi nhận nhiều thay đổi tích cực. Các hãng xe trong nước liên tục ra mắt mẫu xe mới với động cơ và hệ thống quản lý năng lượng được cải thiện rõ rệt.</p><p>Điểm đáng chú ý là phân khúc xe điện phổ thông đang có tốc độ phát triển nhanh nhất, kéo theo giá bán thấp hơn và chính sách ưu đãi từ các địa phương.</p><p>Bên cạnh đó, hệ thống trạm sạc tốc độ mở rộng cũng là yếu tố quan trọng giúp người tiêu dùng yên tâm hơn khi chọn xe điện cho đi lại hằng ngày và đường dài.</p>',
        'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=60',
        'Ban biên tập AutoCare',
        '10000000-0000-0000-0000-000000000001',
        'PUBLISHED',
        TRUE,
        86,
        '2026-11-24 03:20:00',
        '2026-11-24 03:10:00',
        '2026-11-24 03:20:00'
    ),
    (
        '40000000-0000-0000-0000-000000000103',
        '40000000-0000-0000-0000-000000000002',
        '5-dau-hieu-o-to-can-bao-duong-dinh-ky',
        '5 dấu hiệu ô tô cần bảo dưỡng định kỳ ngay lập tức',
        'Tiếng rít khi phanh, mùi lạ trong cabin hay nhiên liệu tăng bất thường — đây là những tín hiệu sớm mà người lái xe không nên bỏ qua.',
        '<p>Bảo dưỡng định kỳ không chỉ là việc thay dầu, thay lọc. Nhiều dấu hiệu bất thường xuất hiện trên xe là cảnh báo sớm để bạn đưa xe vào xưởng kịp thời.</p><ol><li><strong>Tiếng rít khi phanh</strong> — thường do má phanh mòn hoặc đá phanh không còn độ dày tiêu chuẩn.</li><li><strong>Đèn báo động cơ</strong> — không nên tắt đèn để đi tiếp, cần kiểm tra mã lỗi sớm.</li><li><strong>Mùi lạ hoặc khói khét</strong> — có thể liên quan tới hệ thống nhiên liệu hoặc tăng áp.</li><li><strong>Lượng tiêu hao nhiên liệu tăng</strong> — thường do lọch gió, lốp non hoặc hệ thống điều hoà.</li><li><strong>Rung tay lái và lệch xe</strong> — kiểm tra cân bằng bánh, lốp và hệ thống lái.</li></ol><p>Việc kiểm tra định kỳ tại xưởng giúp phát hiện sớm các vấn đề, tiết kiệm chi phí sửa chữa lớn và kéo dài tuổi thọ xe.</p>',
        'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=60',
        'Kỹ thuật viên trưởng',
        '10000000-0000-0000-0000-000000000001',
        'PUBLISHED',
        FALSE,
        64,
        '2026-11-20 08:00:00',
        '2026-11-20 07:40:00',
        '2026-11-20 08:00:00'
    ),
    (
        '40000000-0000-0000-0000-000000000104',
        '40000000-0000-0000-0000-000000000003',
        'uu-dai-bao-duong-dong-xuong-20-thang-11',
        'Ưu đãi bảo dưỡng đồng xuống 20% trong tháng 11 tại AutoCare',
        'Từ ngày 01/11 đến 30/11, khách hàng được giảm trực tiếp 20% giá trị gói bảo dưỡng định kỳ cho mọi dòng xe.',
        '<p>Chương trình ưu đãi bảo dưỡng tháng 11 áp dụng cho tất cả khách hàng khi đặt lịch bảo dưỡng định kỳ tại hệ thống xưởng AutoCare.</p><p>Để nhận ưu đãi, khách hàng chỉ cần đặt lịch qua hotline hoặc trực tiếp trên ứng dụng, ghi rõ mã ưu đãi <strong>BAODUONG20</strong> khi thanh toán.</p><p>Ưu đãi không áp dụng cộng dồn với chương trình khác và số lượng có hạn trong tháng.</p>',
        'https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=1200&q=60',
        'Ban chăm sóc khách hàng',
        '10000000-0000-0000-0000-000000000001',
        'PUBLISHED',
        FALSE,
        42,
        '2026-11-01 02:00:00',
        '2026-11-01 01:30:00',
        '2026-11-01 02:00:00'
    ),
    (
        '40000000-0000-0000-0000-000000000105',
        '40000000-0000-0000-0000-000000000002',
        'huong-dan-sang-mach-dau-bao-duong-dinh-ky',
        'Hướng dẫn đọc mạch đầu: Lịch bảo dưỡng định kỳ theo quy định',
        'Mạch đầu hiển thị mốc bảo dưỡng định kỳ theo km và thời gian, giúp chủ xe theo dõi chính xác các hạng mục cần thay thế.',
        '<p>Trên mạch đầu, nhà sản xuất hiển thị các hạng mục bảo dưỡng theo quy đễ dàng nhận biết: những mốc đã thực hiện và mốc sắp tới đến hạn.</p><p>Thông thường, các hạng mục cốt lõi như thay dầu, thay lọc gió, thay lọc nhiên liệu và kiểm tra phanh sẽ được nhắc trước kế hoạch bảo dưỡng định kỳ tại xưởng.</p><p>Khi đến xưởng, kỹ thuật viên sẽ đối chiếu mạch đầu cùng tình trạng thực tế để đề xuất hạng mục cần thay thế, tránh thay thế thừa.</p>',
        'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=60',
        'Kỹ thuật viên trưởng',
        '10000000-0000-0000-0000-000000000001',
        'DRAFT',
        FALSE,
        0,
        NULL,
        '2026-11-26 09:00:00',
        '2026-11-26 09:00:00'
    )
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

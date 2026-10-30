"""Automatic database & vector store initialization (MySQL `customer_vehicle_service` + Qdrant `car_news`)."""
from __future__ import annotations

import asyncio
import logging
from typing import Any
from urllib.parse import urlparse

import pymysql
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    PointStruct,
    SparseVectorParams,
    VectorParams,
)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.config import get_settings
from app.tools.search_car_news import _encode_dense, _encode_sparse

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Seed Data: 12 Vietnamese Automotive Knowledge Base Articles (Qdrant `car_news`) ──
SEED_ARTICLES: list[dict[str, Any]] = [
    {
        "id": 1,
        "title": "Lịch bảo dưỡng định kỳ xe ô tô theo từng mốc km chuẩn hãng",
        "category": "maintenance",
        "source": "AutoService Vietnam",
        "url": "https://autoservice.vn/cam-nang/lich-bao-duong-o-to",
        "content": (
            "Bảo dưỡng ô tô định kỳ được chia thành 4 cấp độ chính theo số km vận hành:\n"
            "- Cấp 1 (5.000 km hoặc 3 tháng): Thay dầu máy, vệ sinh lọc gió động cơ và lọc gió điều hòa, kiểm tra áp suất lốp, nước làm mát, nước rửa kính.\n"
            "- Cấp 2 (10.000 km hoặc 6 tháng): Thay dầu máy, thay lọc dầu động cơ, đảo lốp cân bằng động, vệ sinh họng ga, kiểm tra má phanh.\n"
            "- Cấp 3 (20.000 - 30.000 km hoặc 1 năm): Thay lọc gió động cơ, lọc gió điều hòa, vệ sinh kim phun buồng đốt, bảo dưỡng phanh 4 bánh.\n"
            "- Cấp 4 (40.000 - 80.000 km hoặc 2-4 năm): Bảo dưỡng lớn gồm thay dầu hộp số, dầu phanh, dầu trợ lực, nước làm mát, lọc xăng, bugi và kiểm tra hệ thống treo, cao su chân máy."
        ),
    },
    {
        "id": 2,
        "title": "Bảng giá sơn dặm, sơn quây và gò hàn phục hồi vết móp trầy xước ô tô 2026",
        "category": "damage_repair",
        "source": "Garage Kỹ Thuật Số",
        "url": "https://autoservice.vn/dich-vu/bang-gia-son-go-han-o-to",
        "content": (
            "Chi phí xử lý vết trầy xước và móp méo thân vỏ phụ thuộc vào mức độ hư hỏng, diện tích (cm²) và phân khúc xe:\n"
            "1. Xước dăm nhẹ (chưa vào lớp sơn lót): Đánh bóng xóa xước 3 bước từ 300.000 - 600.000 VNĐ/vị trí.\n"
            "2. Xước sâu vào lớp nhựa hoặc tôn (Dent/Scratch): Sơn dặm cản trước/sau, tai xe hoặc cánh cửa từ 700.000 - 1.500.000 VNĐ/mảng đối với xe phổ thông.\n"
            "3. Móp méo thân vỏ (Dent): Hút móp không sơn PDR từ 500.000 - 1.200.000 VNĐ; nếu rách sơn phải gò hàn rút tôn + bả matit + sơn lại từ 1.200.000 - 2.800.000 VNĐ/vị trí.\n"
            "4. Vỡ nứt cản nhựa hoặc đèn pha (Crack/Shatter): Hàn nhựa phục hồi cản 800.000 - 1.800.000 VNĐ; phục hồi mặt kính đèn hoặc thay cụm đèn pha 1.500.000 - 8.500.000 VNĐ.\n"
            "Hệ số nhân theo dòng xe: Xe hạng A (0.85x), Sedan/CUV phổ thông (1.0x), SUV 7 chỗ/Bán tải (1.3x), Xe sang Mercedes/BMW/Lexus (2.2x). Sơn ghép từ 2-3 mảng liền kề được giảm 10-15% chi phí pha sơn và phòng sấy."
        ),
    },
    {
        "id": 3,
        "title": "Dấu hiệu nhận biết ắc quy ô tô yếu và khi nào cần thay mới",
        "category": "diagnostics",
        "source": "AutoService Vietnam",
        "url": "https://autoservice.vn/ky-thuat/dau-hieu-ac-quy-yeu",
        "content": (
            "Ắc quy ô tô thường có tuổi thọ từ 2 đến 3.5 năm tại điều kiện khí hậu Việt Nam. Các dấu hiệu cảnh báo cần kiểm tra hoặc thay ắc quy ngay:\n"
            "- Đề nổ buổi sáng khó khăn, âm thanh đề kéo dài 'khẹt khẹt' yếu ớt.\n"
            "- Đèn báo hình bình ắc quy sáng đỏ trên bảng đồng hồ táp-lô.\n"
            "- Đèn pha mờ đi rõ rệt khi bật thêm điều hòa hoặc hạ kính.\n"
            "- Điện áp bình đo khi tắt máy thấp hơn 12.2V (bình chuẩn đạt 12.6V - 12.8V; khi nổ máy máy phát sạc đạt 13.8V - 14.4V).\n"
            "- Vỏ bình bị phồng rộp hoặc hai đầu cọc bám nhiều muối trắng xanh."
        ),
    },
    {
        "id": 4,
        "title": "Phân biệt dầu nhớt 5W-30, 0W-20 và 10W-40 cho từng dòng xe",
        "category": "maintenance",
        "source": "Lubricant Tech VN",
        "url": "https://autoservice.vn/cam-nang/chon-dau-nhot-o-to",
        "content": (
            "Chỉ số SAE trên chai dầu nhớt cho biết độ đặc loãng và khả năng bôi trơn theo nhiệt độ:\n"
            "- 0W-20 / 5W-20: Dầu tổng hợp toàn phần độ loãng cao, tối ưu tiết kiệm nhiên liệu cho xe đời mới Nhật/Hàn (Toyota, Honda, Mazda SkyActiv).\n"
            "- 5W-30: Phổ biến nhất cho hầu hết xe xăng và Turbo hiện đại (Hyundai, Kia, Ford, VinFast, Mercedes), bảo vệ tốt ở nhiệt độ cao.\n"
            "- 5W-40 / 10W-40: Phù hợp cho xe châu Âu hiệu suất cao, xe máy dầu Diesel hoặc xe đã chạy trên 120.000 km cần độ kín khít piston tốt hơn.\n"
            "Lưu ý: Dầu gốc khoáng nên thay sau 5.000 km; dầu bán tổng hợp sau 7.000 km; dầu tổng hợp toàn phần (Fully Synthetic) thay sau 10.000 - 12.000 km."
        ),
    },
    {
        "id": 5,
        "title": "Xử lý vết nứt kính chắn gió ô tô: Khi nào hàn kính, khi nào phải thay?",
        "category": "damage_repair",
        "source": "AutoGlass Care",
        "url": "https://autoservice.vn/dich-vu/han-kinh-chan-gio",
        "content": (
            "Khi kính chắn gió bị đá văng gây nứt (Crack/Shatter):\n"
            "- Có thể hàn kính bằng keo Resin UV nếu: vết nứt hình mắt bò hoặc ngôi sao có đường kính dưới 2.5 cm, vết nứt dài dưới 10 cm, không nằm ngay tầm nhìn thẳng của người lái và chưa xuyên thủng lớp phim PVB ở giữa. Chi phí hàn kính từ 400.000 - 800.000 VNĐ.\n"
            "- Bắt buộc thay kính chắn gió mới nếu: vết nứt xuất phát từ mép kính, nứt lan rộng dạng mạng nhện (shatter) hoặc lõm sâu cả 2 mặt. Chi phí thay kính chính hãng từ 4.500.000 - 15.000.000 VNĐ tùy có cảm biến mưa/ADAS hay không."
        ),
    },
    {
        "id": 6,
        "title": "Nguyên nhân điều hòa ô tô không mát, có mùi hôi và cách khắc phục",
        "category": "diagnostics",
        "source": "AutoService Vietnam",
        "url": "https://autoservice.vn/ky-thuat/dieu-hoa-o-to-khong-mat",
        "content": (
            "5 nguyên nhân phổ biến khiến điều hòa ô tô chỉ ra gió nóng hoặc mát yếu:\n"
            "1. Lọc gió điều hòa quá bẩn gây tắc nghẽn lưu lượng gió (cần vệ sinh mỗi 5.000 km, thay mới mỗi 15.000 - 20.000 km).\n"
            "2. Rò rỉ hoặc thiếu gas lạnh R134a / R1234yf qua các gioăng cao su hoặc thủng giàn nóng phía trước mũi xe.\n"
            "3. Quạt giải nhiệt giàn nóng yếu hoặc hỏng rơ-le khiến áp suất hệ thống tăng cao tự ngắt lốc.\n"
            "4. Lốc điều hòa (Compressor) trượt buly từ hoặc mòn piston nén.\n"
            "5. Giàn lạnh đóng băng hoặc bám bẩn nấm mốc gây mùi chua (nên nội soi vệ sinh giàn lạnh định kỳ mỗi năm 1 lần)."
        ),
    },
    {
        "id": 7,
        "title": "Cẩm nang chăm sóc lốp xe: Áp suất lốp chuẩn, đảo lốp và hạn sử dụng",
        "category": "maintenance",
        "source": "TireCare Vietnam",
        "url": "https://autoservice.vn/cam-nang/cham-soc-lop-xe",
        "content": (
            "Lốp xe ảnh hưởng trực tiếp đến an toàn phanh và mức tiêu hao nhiên liệu:\n"
            "- Áp suất lốp chuẩn: Thường từ 2.2 - 2.5 bar (32 - 36 PSI) khi lốp nguội, xem tem dán ở khung cửa ghế lái.\n"
            "- Đảo lốp & cân bằng động: Thực hiện mỗi 10.000 km để 4 lốp mòn đều, tránh hiện tượng nhao lái hoặc rung vô lăng ở tốc độ 80-100 km/h.\n"
            "- Khi nào cần thay lốp: Khi gai lốp mòn chạm vạch chỉ thị TWI (1.6 mm), lốp bị phồng (chửa) hông lốp, rách thành lốp do cạ vỉa hè, hoặc lốp đã quá 5-6 năm kể từ ngày sản xuất."
        ),
    },
    {
        "id": 8,
        "title": "Triệu chứng hệ thống phanh ô tô gặp sự cố: Kêu rít, đạp sâu, rung bàn đạp",
        "category": "diagnostics",
        "source": "SafetyBrake VN",
        "url": "https://autoservice.vn/ky-thuat/kiem-tra-he-thong-phanh",
        "content": (
            "Cảnh báo an toàn khi phanh xe có các biểu hiện sau:\n"
            "- Tiếng kêu ken két hoặc rít kim loại khi rà phanh: Má phanh đã mòn hết chạm vào phe báo mòn hoặc có sỏi đá kẹt giữa má và đĩa phanh.\n"
            "- Rung bàn đạp phanh và vô lăng khi phanh ở tốc độ cao: Đĩa phanh bị cong vênh hoặc mòn không đều, cần láng đĩa phanh bằng máy chuyên dụng.\n"
            "- Bàn đạp phanh nhẹ bẫng, phải đạp sát sàn mới ăn: Dầu phanh bị lẫn bọt khí (e gió), rò rỉ cuppen tổng phanh hoặc dầu phanh ngậm nước quá 40.000 km chưa thay."
        ),
    },
    {
        "id": 9,
        "title": "Hướng dẫn quy trình bồi thường bảo hiểm thân vỏ ô tô khi va chạm",
        "category": "insurance",
        "source": "AutoService Insurance Desk",
        "url": "https://autoservice.vn/bao-hiem/quy-trinh-boi-thuong-than-vo",
        "content": (
            "Để được bảo hiểm thân vỏ thanh toán 100% chi phí sửa chữa (trừ mức khấu trừ 500.000 VNĐ/vụ):\n"
            "1. Giữ nguyên hiện trường và chụp ảnh rõ biển số, toàn cảnh vị trí va chạm và cận cảnh các vết móp, xước, vỡ đèn/cản.\n"
            "2. Gọi ngay hotline giám định trên giấy chứng nhận bảo hiểm trong vòng 24 giờ.\n"
            "3. Bạn có thể gửi ảnh vết hỏng lên Trợ lý AI của hệ thống để nhận báo giá sơ bộ theo diện tích (cm²) và phân khúc xe trước khi đưa xe vào xưởng liên kết làm hồ sơ giám định."
        ),
    },
    {
        "id": 10,
        "title": "Kinh nghiệm kiểm tra xe ô tô cũ (Used Car Inspection) trước khi xuống tiền",
        "category": "buying_guide",
        "source": "AutoCheck Vietnam",
        "url": "https://autoservice.vn/mua-ban/kinh-nghiem-kiem-tra-xe-cu",
        "content": (
            "Quy trình kiểm định 5 hạng mục vàng khi mua xe ô tô đã qua sử dụng:\n"
            "1. Khung gầm & Keo chỉ: Kiểm tra chỉ cánh cửa, nắp capo, cốp sau và ốc bản lề xem đã từng tháo mở hay gò hàn do đâm đụng chưa.\n"
            "2. Dấu hiệu ngập nước (Thủy kích): Kiểm tra mùi sàn nỉ, rỉ sét chân ghế, bùn đất trong hốc dây đai an toàn và ốc máy.\n"
            "3. Động cơ & Hộp số: Nổ máy êm, không có khói xanh/đen ở ống xả, vào số D/R mượt không giật cục.\n"
            "4. Hệ thống điện & ODO: Quét lỗi OBD-II để đối chiếu số km thực tế trong ECU và lịch sử bảo dưỡng hãng.\n"
            "5. Pháp lý: Kiểm tra đăng kiểm, phạt nguội và giấy tờ công chứng sang tên."
        ),
    },
    {
        "id": 11,
        "title": "Bảo dưỡng xe điện (EV) khác gì xe xăng? Lưu ý chăm sóc pin cao áp",
        "category": "ev_care",
        "source": "EV Tech Vietnam",
        "url": "https://autoservice.vn/xe-dien/bao-duong-xe-dien-ev",
        "content": (
            "Xe điện (như VinFast VF5, VF6, VF8, VF9, Hyundai Ioniq 5) không cần thay dầu động cơ, bugi hay lọc xăng nên chi phí bảo dưỡng định kỳ chỉ bằng 30-40% xe xăng:\n"
            "- Mốc bảo dưỡng: Mỗi 12.000 km hoặc 1 năm.\n"
            "- Hạng mục chính: Kiểm tra nước làm mát pin cao áp, lọc gió điều hòa, dầu hộp số giảm tốc, dầu phanh, độ mòn lốp (xe điện nặng và mô-men xoắn lớn nên mòn lốp nhanh hơn khoảng 15%).\n"
            "- Lưu ý bảo vệ gầm pin: Tránh leo vỉa hè cao hoặc sập ổ gà sâu gây móp tấm chắn gầm pin; duy trì mức sạc 20% - 80% trong sử dụng hàng ngày để tối ưu tuổi thọ pin LFP/NCA."
        ),
    },
    {
        "id": 12,
        "title": "Ý nghĩa các đèn cảnh báo quan trọng trên bảng đồng hồ táp-lô ô tô",
        "category": "diagnostics",
        "source": "AutoService Vietnam",
        "url": "https://autoservice.vn/ky-thuat/y-nghia-den-canh-bao-tap-lo",
        "content": (
            "Phân loại mức độ nguy hiểm theo màu sắc đèn cảnh báo trên táp-lô:\n"
            "- Màu ĐỎ (Nguy hiểm - Cần dừng xe kiểm tra ngay): Đèn áp suất dầu bôi trơn thấp, đèn quá nhiệt nước làm mát động cơ, đèn lỗi hệ thống phanh/chưa hạ phanh tay, đèn lỗi sạc ắc quy, đèn túi khí.\n"
            "- Màu VÀNG/CAM (Cảnh báo - Cần đưa xe đi kiểm tra sớm): Đèn Cá Vàng (Check Engine - lỗi động cơ/khí thải), đèn ABS, đèn cân bằng điện tử ESP, đèn cảnh báo áp suất lốp TPMS.\n"
            "- Màu XANH/TRẮNG: Đèn báo hệ thống đang hoạt động bình thường (đèn cos/pha, xi-nhan, Cruise Control)."
        ),
    },
]

# ── Seed Data: 12 Vietnamese Used Cars (MySQL `used_cars`) ────────────────────
SEED_USED_CARS: list[dict[str, Any]] = [
    {
        "id": 1,
        "brand": "Toyota",
        "model": "Vios 1.5G CVT",
        "year": 2022,
        "price": 485_000_000,
        "mileage": 28_000,
        "color": "Trắng ngọc trai",
        "location": "TP. Hồ Chí Minh",
        "description": "Xe gia đình 1 chủ từ đầu, bảo dưỡng hãng đầy đủ, không đâm đụng ngập nước.",
    },
    {
        "id": 2,
        "brand": "Toyota",
        "model": "Corolla Cross 1.8V",
        "year": 2023,
        "price": 760_000_000,
        "mileage": 15_000,
        "color": "Đỏ ánh kim",
        "location": "Hà Nội",
        "description": "Bản V full option, cam 360, cửa sổ trời, lốp sơ cua chưa hạ.",
    },
    {
        "id": 3,
        "brand": "Toyota",
        "model": "Camry 2.5Q",
        "year": 2022,
        "price": 1_180_000_000,
        "mileage": 25_000,
        "color": "Trắng ngọc trai",
        "location": "Hà Nội",
        "description": "Camry 2.5Q cao cấp nhất, nội thất da bò, bảo dưỡng chính hãng định kỳ.",
    },
    {
        "id": 4,
        "brand": "Honda",
        "model": "City RS",
        "year": 2022,
        "price": 510_000_000,
        "mileage": 31_000,
        "color": "Xanh đậm",
        "location": "Đà Nẵng",
        "description": "Honda Sensing, lẫy chuyển số vô lăng, nội thất da lộn nguyên bản.",
    },
    {
        "id": 5,
        "brand": "Honda",
        "model": "CR-V 1.5L Turbo",
        "year": 2021,
        "price": 835_000_000,
        "mileage": 42_000,
        "color": "Đen ánh",
        "location": "TP. Hồ Chí Minh",
        "description": "Xe 7 chỗ rộng rãi, cốp điện, bảo hiểm thân vỏ còn hạn đến 2026.",
    },
    {
        "id": 6,
        "brand": "Mazda",
        "model": "CX-5 2.0 Premium",
        "year": 2023,
        "price": 790_000_000,
        "mileage": 18_000,
        "color": "Đỏ Soul Red",
        "location": "Hà Nội",
        "description": "Bản Premium có HUD, loa Bose 10 loa, cảnh báo điểm mù.",
    },
    {
        "id": 7,
        "brand": "Mazda",
        "model": "Mazda3 1.5L Luxury",
        "year": 2021,
        "price": 565_000_000,
        "mileage": 35_000,
        "color": "Xám Polymetal",
        "location": "TP. Hồ Chí Minh",
        "description": "Form mới cực đẹp, tiết kiệm nhiên liệu 6L/100km.",
    },
    {
        "id": 8,
        "brand": "Hyundai",
        "model": "Accent 1.4 AT Đặc biệt",
        "year": 2022,
        "price": 445_000_000,
        "mileage": 29_000,
        "color": "Bạc",
        "location": "Bình Dương",
        "description": "Cửa sổ trời, màn hình Apple CarPlay, đề nổ từ xa.",
    },
    {
        "id": 9,
        "brand": "Hyundai",
        "model": "Tucson 1.6 Turbo",
        "year": 2023,
        "price": 875_000_000,
        "mileage": 12_000,
        "color": "Trắng",
        "location": "Hà Nội",
        "description": "Dẫn động HTRAC, cần số nút bấm, sưởi/làm mát ghế.",
    },
    {
        "id": 10,
        "brand": "Ford",
        "model": "Ranger Wildtrak 2.0L",
        "year": 2023,
        "price": 895_000_000,
        "mileage": 22_000,
        "color": "Cam",
        "location": "TP. Hồ Chí Minh",
        "description": "Bi-Turbo 4x4, nắp thùng cuộn điện, màn hình dọc 12 inch.",
    },
    {
        "id": 11,
        "brand": "VinFast",
        "model": "VF 8 Plus",
        "year": 2023,
        "price": 950_000_000,
        "mileage": 14_000,
        "color": "Xanh lục bảo",
        "location": "Hà Nội",
        "description": "Kèm pin mua đứt, ADAS cấp độ 2, bảo hành 10 năm.",
    },
    {
        "id": 12,
        "brand": "Kia",
        "model": "Sorento 2.2D Signature",
        "year": 2022,
        "price": 1_050_000_000,
        "mileage": 30_000,
        "color": "Đen",
        "location": "Hà Nội",
        "description": "Bản 6 ghế Captain, máy dầu tiết kiệm, full ADAS.",
    },
]

_CREATE_USED_CARS_MYSQL_SQL = """
CREATE TABLE IF NOT EXISTS used_cars (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    brand       VARCHAR(100) NOT NULL,
    model       VARCHAR(100) NOT NULL,
    year        INT NOT NULL,
    price       DECIMAL(15, 0) NOT NULL,
    mileage     INT DEFAULT 0,
    color       VARCHAR(50),
    location    VARCHAR(100),
    description TEXT,
    image_url   TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_used_cars_brand (brand),
    INDEX idx_used_cars_price (price),
    INDEX idx_used_cars_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

_INSERT_USED_CAR_SQL = """
INSERT INTO used_cars (id, brand, model, year, price, mileage, color, location, description)
VALUES (:id, :brand, :model, :year, :price, :mileage, :color, :location, :description)
ON DUPLICATE KEY UPDATE
    brand = VALUES(brand),
    model = VALUES(model),
    year = VALUES(year),
    price = VALUES(price),
    mileage = VALUES(mileage),
    color = VALUES(color),
    location = VALUES(location),
    description = VALUES(description);
"""

# ── Schema & Seed Data for `customer-vehicle-service` (`V1` + `V3` + `V5`) ────
_CREATE_CUSTOMERS_MYSQL_SQL = """
CREATE TABLE IF NOT EXISTS `customers` (
    `id`         VARCHAR(36)  NOT NULL,
    `user_id`    VARCHAR(36)  NULL,
    `full_name`  VARCHAR(150) NOT NULL,
    `phone`      VARCHAR(20)  NULL,
    `email`      VARCHAR(255) NULL,
    `address`    VARCHAR(500) NULL,
    `notes`      TEXT         NULL,
    `is_active`  BOOLEAN      NOT NULL DEFAULT TRUE,
    `created_at` DATETIME(6)  NOT NULL,
    `updated_at` DATETIME(6)  NOT NULL,
    `deleted_at` DATETIME(6)  NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_customers_user_id` (`user_id`),
    INDEX `idx_customers_phone` (`phone`),
    INDEX `idx_customers_email` (`email`),
    INDEX `idx_customers_deleted_at` (`deleted_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
"""

_CREATE_VEHICLES_MYSQL_SQL = """
CREATE TABLE IF NOT EXISTS `vehicles` (
    `id`            VARCHAR(36)  NOT NULL,
    `license_plate` VARCHAR(20)  NOT NULL,
    `vin`           VARCHAR(17)  NULL,
    `make`          VARCHAR(100) NOT NULL,
    `model`         VARCHAR(100) NOT NULL,
    `model_year`    SMALLINT     NULL,
    `trim`          VARCHAR(100) NULL,
    `color`         VARCHAR(50)  NULL,
    `fuel_type`     VARCHAR(30)  NULL,
    `transmission`  VARCHAR(30)  NULL,
    `odometer_km`   INT UNSIGNED NULL,
    `notes`         TEXT         NULL,
    `is_active`     BOOLEAN      NOT NULL DEFAULT TRUE,
    `created_at`    DATETIME(6)  NOT NULL,
    `updated_at`    DATETIME(6)  NOT NULL,
    `deleted_at`    DATETIME(6)  NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_vehicles_vin` (`vin`),
    INDEX `idx_vehicles_license_plate` (`license_plate`),
    INDEX `idx_vehicles_deleted_at` (`deleted_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
"""

_CREATE_SERVICE_HISTORIES_MYSQL_SQL = """
CREATE TABLE IF NOT EXISTS `vehicle_service_histories` (
    `id`            VARCHAR(36)  NOT NULL,
    `vehicle_id`    VARCHAR(36)  NOT NULL,
    `customer_id`   VARCHAR(36)  NULL,
    `work_order_id` VARCHAR(36)  NULL,
    `record_type`   VARCHAR(30)  NOT NULL,
    `service_date`  DATETIME(6)  NOT NULL,
    `odometer_km`   INT UNSIGNED NULL,
    `summary`       VARCHAR(255) NOT NULL,
    `description`   TEXT         NULL,
    `garage_name`   VARCHAR(150) NULL,
    `created_at`    DATETIME(6)  NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_vehicle_service_histories_work_order_id` (`work_order_id`),
    INDEX `idx_vehicle_service_histories_vehicle_date` (`vehicle_id`, `service_date`),
    INDEX `idx_vehicle_service_histories_customer_date` (`customer_id`, `service_date`),
    CONSTRAINT `fk_vehicle_service_histories_vehicle`
        FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`)
        ON DELETE RESTRICT,
    CONSTRAINT `fk_vehicle_service_histories_customer`
        FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
        ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
"""

SEED_CUSTOMERS: list[dict[str, Any]] = [
    {
        "id": "40000000-0000-0000-0000-000000000001",
        "user_id": "10000000-0000-0000-0000-000000000001",
        "full_name": "Nguyễn Văn An",
        "phone": "0901234567",
        "email": "an.nguyen@example.com",
        "address": "12 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
        "notes": "Khách hàng thân thiết, ưu tiên nhắc lịch bảo dưỡng định kỳ.",
        "is_active": True,
        "created_at": "2025-01-05 09:00:00",
        "deleted_at": None,
    },
    {
        "id": "40000000-0000-0000-0000-000000000002",
        "user_id": None,
        "full_name": "Trần Thị Bình",
        "phone": "0912345678",
        "email": "binh.tran@example.com",
        "address": "45 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
        "notes": None,
        "is_active": True,
        "created_at": "2025-03-18 14:30:00",
        "deleted_at": None,
    },
    {
        "id": "40000000-0000-0000-0000-000000000003",
        "user_id": None,
        "full_name": "Lê Quốc Cường",
        "phone": "0923456789",
        "email": "cuong.le@example.com",
        "address": "8 Trần Phú, Hà Nội",
        "notes": None,
        "is_active": True,
        "created_at": "2025-06-02 10:15:00",
        "deleted_at": None,
    },
    {
        "id": "40000000-0000-0000-0000-000000000004",
        "user_id": None,
        "full_name": "Phạm Thu Dung",
        "phone": "0934567890",
        "email": "dung.pham@example.com",
        "address": "210 Điện Biên Phủ, Quận 3, TP. Hồ Chí Minh",
        "notes": "Tạm ngừng sử dụng, xe đang gửi bảo dưỡng.",
        "is_active": False,
        "created_at": "2025-08-11 16:45:00",
        "deleted_at": None,
    },
]

SEED_VEHICLES: list[dict[str, Any]] = [
    {
        "id": "50000000-0000-0000-0000-000000000001",
        "license_plate": "51H-123.45",
        "vin": "JTDKN3DU5A0123456",
        "make": "Toyota",
        "model": "Vios",
        "model_year": 2020,
        "trim": "1.5G CVT",
        "color": "Bạc",
        "fuel_type": "Xăng",
        "transmission": "Tự động",
        "odometer_km": 45000,
        "notes": "Xe gia đình bảo dưỡng đều đặn.",
        "is_active": True,
        "created_at": "2025-01-05 09:05:00",
    },
    {
        "id": "50000000-0000-0000-0000-000000000002",
        "license_plate": "51H-678.90",
        "vin": "1HGCM82633A004352",
        "make": "Honda",
        "model": "City",
        "model_year": 2021,
        "trim": "RS",
        "color": "Đen",
        "fuel_type": "Xăng",
        "transmission": "Tự động",
        "odometer_km": 28000,
        "notes": None,
        "is_active": True,
        "created_at": "2025-07-22 13:00:00",
    },
    {
        "id": "50000000-0000-0000-0000-000000000003",
        "license_plate": "51H-246.80",
        "vin": "1FTFW1ET4EFA12345",
        "make": "Ford",
        "model": "Ranger",
        "model_year": 2022,
        "trim": "Wildtrak",
        "color": "Xám",
        "fuel_type": "Diesel",
        "transmission": "Tự động",
        "odometer_km": 62000,
        "notes": "Xe chở hàng nặng, cần kiểm tra phuộc thường xuyên.",
        "is_active": True,
        "created_at": "2025-04-09 10:00:00",
    },
    {
        "id": "50000000-0000-0000-0000-000000000004",
        "license_plate": "30H-111.22",
        "vin": None,
        "make": "Hyundai",
        "model": "Grand i10",
        "model_year": 2019,
        "trim": "1.2 AT",
        "color": "Trắng",
        "fuel_type": "Xăng",
        "transmission": "Tự động",
        "odometer_km": 51000,
        "notes": None,
        "is_active": True,
        "created_at": "2025-05-14 15:20:00",
    },
    {
        "id": "50000000-0000-0000-0000-000000000005",
        "license_plate": "51H-555.66",
        "vin": "KMHDH41DBFU123456",
        "make": "Mazda",
        "model": "CX-5",
        "model_year": 2023,
        "trim": "2.0 Premium",
        "color": "Đỏ Soul Red",
        "fuel_type": "Xăng",
        "transmission": "Tự động",
        "odometer_km": 18500,
        "notes": None,
        "is_active": True,
        "created_at": "2025-08-11 16:50:00",
    },
]

SEED_SERVICE_HISTORIES: list[dict[str, Any]] = [
    {
        "id": "60000000-0000-0000-0000-000000000001",
        "vehicle_id": "50000000-0000-0000-0000-000000000001",
        "customer_id": "40000000-0000-0000-0000-000000000001",
        "work_order_id": None,
        "record_type": "EXTERNAL_SERVICE",
        "service_date": "2025-01-20 09:30:00",
        "odometer_km": 25000,
        "summary": "Thay dầu động cơ và lọc gió",
        "description": "Dầu 0W-20 theo khuyến cáo của hãng. Đã kiểm tra mức nước làm mát và bình phanh.",
        "garage_name": "Gara Minh Phát",
        "created_at": "2025-01-20 11:00:00",
    },
    {
        "id": "60000000-0000-0000-0000-000000000002",
        "vehicle_id": "50000000-0000-0000-0000-000000000001",
        "customer_id": "40000000-0000-0000-0000-000000000001",
        "work_order_id": None,
        "record_type": "EXTERNAL_SERVICE",
        "service_date": "2025-07-25 10:15:00",
        "odometer_km": 35000,
        "summary": "Bảo dưỡng định kỳ 35.000 km",
        "description": "Thay dầu, lọc gió, lọc xăng, kiểm tra phuộc và bơm xe. Thay lốp trước bị mòn.",
        "garage_name": "Gara Minh Phát",
        "created_at": "2025-07-25 12:00:00",
    },
    {
        "id": "60000000-0000-0000-0000-000000000008",
        "vehicle_id": "50000000-0000-0000-0000-000000000001",
        "customer_id": "40000000-0000-0000-0000-000000000003",
        "work_order_id": None,
        "record_type": "EXTERNAL_SERVICE",
        "service_date": "2026-01-10 09:45:00",
        "odometer_km": 42500,
        "summary": "Kiểm tra hệ thống phanh",
        "description": "Thay má phanh trước và bổ sung nước làm mát. Xe được gửi hộ bởi Lê Quốc Cường.",
        "garage_name": "An Phú Auto",
        "created_at": "2026-01-10 11:00:00",
    },
    {
        "id": "60000000-0000-0000-0000-000000000003",
        "vehicle_id": "50000000-0000-0000-0000-000000000001",
        "customer_id": "40000000-0000-0000-0000-000000000001",
        "work_order_id": None,
        "record_type": "CUSTOMER_REPORTED",
        "service_date": "2026-02-12 08:00:00",
        "odometer_km": 44000,
        "summary": "Thay phuộc trước bên trái & sơn dặm cản trước",
        "description": "Khách hàng báo đã thay phuộc trước bên trái và sơn dặm vết xước cản trước.",
        "garage_name": None,
        "created_at": "2026-02-12 08:00:00",
    },
    {
        "id": "60000000-0000-0000-0000-000000000004",
        "vehicle_id": "50000000-0000-0000-0000-000000000002",
        "customer_id": "40000000-0000-0000-0000-000000000002",
        "work_order_id": None,
        "record_type": "EXTERNAL_SERVICE",
        "service_date": "2025-08-05 14:00:00",
        "odometer_km": 28000,
        "summary": "Bảo dưỡng định kỳ 28.000 km & Cân chỉnh thước lái",
        "description": "Thay dầu máy, lọc dầu, kiểm tra áp suất lốp và cân chỉnh góc đặt bánh xe.",
        "garage_name": "An Phú Auto",
        "created_at": "2025-08-05 15:30:00",
    },
    {
        "id": "60000000-0000-0000-0000-000000000005",
        "vehicle_id": "50000000-0000-0000-0000-000000000003",
        "customer_id": "40000000-0000-0000-0000-000000000003",
        "work_order_id": None,
        "record_type": "EXTERNAL_SERVICE",
        "service_date": "2025-10-11 09:00:00",
        "odometer_km": 40000,
        "summary": "Thay phuộc trước và bảo dưỡng phanh",
        "description": "Phuộc trước rò dầu, đã thay cả cặp trước và kiểm tra lại góc chỉnh.",
        "garage_name": "Gara Minh Phát",
        "created_at": "2025-10-11 11:45:00",
    },
    {
        "id": "60000000-0000-0000-0000-000000000006",
        "vehicle_id": "50000000-0000-0000-0000-000000000004",
        "customer_id": "40000000-0000-0000-0000-000000000004",
        "work_order_id": None,
        "record_type": "CUSTOMER_REPORTED",
        "service_date": "2025-12-01 17:30:00",
        "odometer_km": 50000,
        "summary": "Thay máy phát điện & ắc quy",
        "description": "Mất điện khởi động buổi sáng, thay mới máy phát và bình ắc quy 12V.",
        "garage_name": None,
        "created_at": "2025-12-02 08:20:00",
    },
    {
        "id": "60000000-0000-0000-0000-000000000007",
        "vehicle_id": "50000000-0000-0000-0000-000000000005",
        "customer_id": "40000000-0000-0000-0000-000000000004",
        "work_order_id": None,
        "record_type": "EXTERNAL_SERVICE",
        "service_date": "2026-03-08 10:00:00",
        "odometer_km": 18500,
        "summary": "Bảo dưỡng định kỳ 18.000 km",
        "description": "Thay dầu, lọc gió, kiểm tra lốp và phanh. Không có vấn đề gì bất thường.",
        "garage_name": "An Phú Auto",
        "created_at": "2026-03-08 11:15:00",
    },
]


def _provision_mysql_database_sync(dsn: str) -> None:
    """Ensure target MySQL database and user exist (supports both Docker MySQL and local Windows MySQL)."""
    parsed = urlparse(dsn.replace("mysql+aiomysql://", "mysql://"))
    host = parsed.hostname or "localhost"
    port = parsed.port or 3306
    target_user = parsed.username or "app"
    target_pass = parsed.password or "apppassword123"
    target_db = (parsed.path or "/customer_vehicle_service").lstrip("/").split("?")[0] or "customer_vehicle_service"

    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=target_user,
            password=target_pass,
            database=target_db,
            connect_timeout=2,
        )
        conn.close()
        return
    except Exception:
        pass

    admin_candidates = [
        ("root", "123456"),
        ("root", "rootpassword123"),
        ("root", ""),
        (target_user, target_pass),
    ]
    for admin_user, admin_pass in admin_candidates:
        try:
            conn = pymysql.connect(
                host=host,
                port=port,
                user=admin_user,
                password=admin_pass,
                autocommit=True,
                connect_timeout=2,
            )
            with conn.cursor() as cur:
                for db_name in (target_db, "user_service", "automotive_service"):
                    cur.execute(
                        f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                    )
                if admin_user == "root" and target_user != "root":
                    cur.execute(
                        f"CREATE USER IF NOT EXISTS '{target_user}'@'localhost' IDENTIFIED BY '{target_pass}'"
                    )
                    cur.execute(
                        f"CREATE USER IF NOT EXISTS '{target_user}'@'%' IDENTIFIED BY '{target_pass}'"
                    )
                    for db_name in (target_db, "user_service", "automotive_service"):
                        cur.execute(
                            f"GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{target_user}'@'localhost'"
                        )
                        cur.execute(
                            f"GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{target_user}'@'%'"
                        )
                    cur.execute("FLUSH PRIVILEGES")
            conn.close()
            logger.info("Provisioned MySQL database '%s' and user '%s' on %s:%s", target_db, target_user, host, port)
            return
        except Exception:
            continue


async def ensure_mysql_seeded(engine: AsyncEngine) -> int:
    """Ensure `used_cars`, `customers`, `vehicles`, and `vehicle_service_histories` exist in MySQL and are seeded."""
    try:
        await asyncio.to_thread(_provision_mysql_database_sync, settings.effective_database_url)
        async with engine.begin() as conn:
            # 1. used_cars
            await conn.execute(text(_CREATE_USED_CARS_MYSQL_SQL))
            res = await conn.execute(text("SELECT COUNT(*) FROM used_cars"))
            used_count = int(res.scalar() or 0)
            if used_count == 0:
                for car in SEED_USED_CARS:
                    await conn.execute(text(_INSERT_USED_CAR_SQL), car)
                used_count = len(SEED_USED_CARS)
                logger.info("MySQL auto-seed: inserted %d used cars into `used_cars`.", used_count)

            # 2. customer-vehicle-service tables (`customers`, `vehicles`, `vehicle_service_histories`)
            await conn.execute(text(_CREATE_CUSTOMERS_MYSQL_SQL))
            await conn.execute(text(_CREATE_VEHICLES_MYSQL_SQL))
            await conn.execute(text(_CREATE_SERVICE_HISTORIES_MYSQL_SQL))

            cust_res = await conn.execute(text("SELECT COUNT(*) FROM customers"))
            cust_count = int(cust_res.scalar() or 0)
            if cust_count == 0:
                for c in SEED_CUSTOMERS:
                    await conn.execute(
                        text(
                            """
                            INSERT IGNORE INTO customers
                                (id, user_id, full_name, phone, email, address, notes, is_active, created_at, updated_at, deleted_at)
                            VALUES
                                (:id, :user_id, :full_name, :phone, :email, :address, :notes, :is_active, :created_at, :created_at, :deleted_at)
                            """
                        ),
                        c,
                    )

            veh_res = await conn.execute(text("SELECT COUNT(*) FROM vehicles"))
            veh_count = int(veh_res.scalar() or 0)
            if veh_count == 0:
                for v in SEED_VEHICLES:
                    await conn.execute(
                        text(
                            """
                            INSERT IGNORE INTO vehicles
                                (id, license_plate, vin, make, model, model_year, trim, color, fuel_type, transmission, odometer_km, notes, is_active, created_at, updated_at, deleted_at)
                            VALUES
                                (:id, :license_plate, :vin, :make, :model, :model_year, :trim, :color, :fuel_type, :transmission, :odometer_km, :notes, :is_active, :created_at, :created_at, NULL)
                            """
                        ),
                        v,
                    )

            hist_res = await conn.execute(text("SELECT COUNT(*) FROM vehicle_service_histories"))
            hist_count = int(hist_res.scalar() or 0)
            if hist_count == 0:
                for h in SEED_SERVICE_HISTORIES:
                    await conn.execute(
                        text(
                            """
                            INSERT IGNORE INTO vehicle_service_histories
                                (id, vehicle_id, customer_id, work_order_id, record_type, service_date, odometer_km, summary, description, garage_name, created_at)
                            VALUES
                                (:id, :vehicle_id, :customer_id, :work_order_id, :record_type, :service_date, :odometer_km, :summary, :description, :garage_name, :created_at)
                            """
                        ),
                        h,
                    )
                logger.info(
                    "MySQL auto-seed: initialized `customers` (%d), `vehicles` (%d), `vehicle_service_histories` (%d).",
                    len(SEED_CUSTOMERS),
                    len(SEED_VEHICLES),
                    len(SEED_SERVICE_HISTORIES),
                )
            else:
                logger.info(
                    "MySQL `customer_vehicle_service` tables ready (`used_cars`=%d, `customers`=%d, `vehicles`=%d, `histories`=%d).",
                    used_count,
                    cust_count,
                    veh_count,
                    hist_count,
                )
            return used_count
    except Exception as exc:
        logger.warning("Could not auto-seed MySQL `customer_vehicle_service` (%s).", exc)
        return 0


def _build_qdrant_points() -> list[PointStruct]:
    """Encode all SEED_ARTICLES into Qdrant PointStruct objects (dense 384d + sparse BM25)."""
    points: list[PointStruct] = []
    for art in SEED_ARTICLES:
        full_text = f"{art['title']}. {art['content']}"
        dense_vec = _encode_dense(full_text)
        sparse_vec = _encode_sparse(full_text)
        points.append(
            PointStruct(
                id=art["id"],
                vector={
                    "dense": dense_vec,
                    "sparse": sparse_vec,
                },
                payload={
                    "title": art["title"],
                    "content": art["content"],
                    "category": art["category"],
                    "source": art["source"],
                    "url": art["url"],
                },
            )
        )
    return points


async def ensure_qdrant_seeded(
    qdrant_client: AsyncQdrantClient,
    collection_name: str | None = None,
) -> int:
    """Ensure the Qdrant `car_news` collection exists and contains hybrid-indexed automotive articles."""
    col = collection_name or settings.qdrant_news_collection
    try:
        collections_resp = await qdrant_client.get_collections()
        existing = [c.name for c in collections_resp.collections]

        if col not in existing:
            logger.info("Creating Qdrant hybrid collection '%s' (Dense 384d + Sparse BM25)...", col)
            await qdrant_client.create_collection(
                collection_name=col,
                vectors_config={
                    "dense": VectorParams(size=384, distance=Distance.COSINE),
                },
                sparse_vectors_config={
                    "sparse": SparseVectorParams(),
                },
            )

        count_resp = await qdrant_client.count(collection_name=col, exact=True)
        current_count = int(count_resp.count or 0)

        if current_count < len(SEED_ARTICLES):
            logger.info(
                "Qdrant collection '%s' has %d points (< %d). Encoding and seeding articles...",
                col,
                current_count,
                len(SEED_ARTICLES),
            )
            points = await asyncio.to_thread(_build_qdrant_points)
            await qdrant_client.upsert(
                collection_name=col,
                points=points,
                wait=True,
            )
            current_count = len(points)
            logger.info(
                "Qdrant auto-seed complete: %d articles indexed in '%s'.",
                current_count,
                col,
            )
        else:
            logger.info(
                "Qdrant collection '%s' ready (%d points present).",
                col,
                current_count,
            )
        return current_count
    except Exception as exc:
        logger.warning("Could not auto-seed Qdrant collection '%s' (%s).", col, exc)
        return 0

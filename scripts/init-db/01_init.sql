-- MySQL Initialization Script for Automotive Service Platform (customer_vehicle_service)
USE customer_vehicle_service;

-- Used Cars Listing Table (queried by agent-service -> search_used_cars tool)
CREATE TABLE IF NOT EXISTS used_cars (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    brand       VARCHAR(100) NOT NULL,
    model       VARCHAR(100) NOT NULL,
    year        INT NOT NULL,
    price       DECIMAL(15, 0) NOT NULL COMMENT 'Price in VND',
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

-- Seed sample Vietnamese market used cars (idempotent)
INSERT INTO used_cars (id, brand, model, year, price, mileage, color, location, description) VALUES
(1, 'Toyota',    'Vios 1.5G CVT',         2022, 485000000,  28000, 'Trắng ngọc trai', 'TP. Hồ Chí Minh', 'Xe gia đình 1 chủ từ đầu, bảo dưỡng hãng đầy đủ, không đâm đụng ngập nước.'),
(2, 'Toyota',    'Corolla Cross 1.8V',     2023, 760000000,  15000, 'Đỏ ánh kim',      'Hà Nội',          'Bản V full option, cam 360, cửa sổ trời, lốp sơ cua chưa hạ.'),
(3, 'Toyota',    'Camry 2.5Q',             2022, 1180000000, 25000, 'Trắng ngọc trai', 'Hà Nội',          'Camry 2.5Q cao cấp nhất, nội thất da bò, bảo dưỡng chính hãng định kỳ.'),
(4, 'Honda',     'City RS',                2022, 510000000,  31000, 'Xanh đậm',        'Đà Nẵng',         'Honda Sensing, lẫy chuyển số vô lăng, nội thất da lộn nguyên bản.'),
(5, 'Honda',     'CR-V 1.5L Turbo',        2021, 835000000,  42000, 'Đen ánh',         'TP. Hồ Chí Minh', 'Xe 7 chỗ rộng rãi, cốp điện, bảo hiểm thân vỏ còn hạn đến 2026.'),
(6, 'Mazda',     'CX-5 2.0 Premium',       2023, 790000000,  18000, 'Đỏ Soul Red',     'Hà Nội',          'Bản Premium có HUD, loa Bose 10 loa, cảnh báo điểm mù.'),
(7, 'Mazda',     'Mazda3 1.5L Luxury',     2021, 565000000,  35000, 'Xám Polymetal',   'TP. Hồ Chí Minh', 'Form mới cực đẹp, tiết kiệm nhiên liệu 6L/100km.'),
(8, 'Hyundai',   'Accent 1.4 AT Đặc biệt', 2022, 445000000,  29000, 'Bạc',             'Bình Dương',      'Cửa sổ trời, màn hình Apple CarPlay, đề nổ từ xa.'),
(9, 'Hyundai',   'Tucson 1.6 Turbo',       2023, 875000000,  12000, 'Trắng',           'Hà Nội',          'Dẫn động HTRAC, cần số nút bấm, sưởi/làm mát ghế.'),
(10, 'Ford',     'Ranger Wildtrak 2.0L',   2023, 895000000,  22000, 'Cam',             'TP. Hồ Chí Minh', 'Bi-Turbo 4x4, nắp thùng cuộn điện, màn hình dọc 12 inch.'),
(11, 'VinFast',  'VF 8 Plus',              2023, 950000000,  14000, 'Xanh lục bảo',    'Hà Nội',          'Kèm pin mua đứt, ADAS cấp độ 2, bảo hành 10 năm.'),
(12, 'Kia',      'Sorento 2.2D Signature', 2022, 1050000000, 30000, 'Đen',             'Hà Nội',          'Bản 6 ghế Captain, máy dầu tiết kiệm, full ADAS.')
ON DUPLICATE KEY UPDATE
    brand = VALUES(brand),
    model = VALUES(model),
    year = VALUES(year),
    price = VALUES(price),
    mileage = VALUES(mileage),
    color = VALUES(color),
    location = VALUES(location),
    description = VALUES(description);

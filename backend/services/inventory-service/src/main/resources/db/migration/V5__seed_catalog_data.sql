-- Seed catalog dịch vụ + phụ tùng cho inventory-service.
--
-- GLOBAL_RULES §7: mỗi thay đổi tạo migration mới, không sửa migration đã dùng.
--
-- Vì sao cần migration này?
--   V1__init_inventory_schema.sql chỉ tạo SCHEMA (DDL), không có INSERT nào.
--   Hệ quả: `GET /api/services` và `GET /api/parts` trả về danh sách RỖNG
--   dù API hoạt động bình thường. Frontend (frontend/src/data/catalog.tsx) có
--   fallback sang dữ liệu mẫu nên web vẫn hiển thị được, nhưng đó là dữ liệu
--   giả — không phản ánh catalog thật của xưởng.
--
-- Migration này đưa catalog mẫu vào database để:
--   1. `GET /api/services`, `/api/parts`, `/api/service-categories`,
--      `/api/part-categories` trả về dữ liệu thật.
--   2. `GET /api/services/{id}/bom` (mục 31) và
--      `GET /api/parts/{id}/compatibilities` (mục 32) có dữ liệu để hiển thị.
--   3. Đồng bộ với `frontend/src/data/mock.ts` để hình ảnh trước/sau khi
--      bật backend là nhất quán.
--
-- ID cố định (deterministic UUID) để:
--   - chạy lại migration không sinh dữ liệu trùng;
--   - `service_boms` / `part_vehicle_compatibilities` tham chiếu được bằng
--     UUID viết tay thay vì phải tra cứu.
--
-- Toàn bộ INSERT dùng `INSERT IGNORE` / `ON DUPLICATE KEY UPDATE` để an toàn
-- nếu migration được apply lại.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. NHÓM DỊCH VỤ
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `service_categories` (`id`, `code`, `name`, `description`, `created_at`) VALUES
('c0000000-0000-4000-8000-000000000001', 'BAO_DUONG',   'Bảo dưỡng',        'Bảo dưỡng định kỳ theo khuyến cáo của nhà sản xuất xe.', NOW(6)),
('c0000000-0000-4000-8000-000000000002', 'SUA_CHUA',    'Sửa chữa',         'Khắc phục hư hỏng kỹ thuật bằng linh kiện chính hãng.', NOW(6)),
('c0000000-0000-4000-8000-000000000003', 'SON_THE_VO',  'Sơn & thân vỏ',    'Sơn, đánh bóng và phục hồi thân vỏ trong phòng sơn kín.', NOW(6)),
('c0000000-0000-4000-8000-000000000004', 'DIEN_DIEU_HOA','Điện - Điều hòa',  'Chăm sóc hệ thống điện, ắc quy và điều hòa.', NOW(6)),
('c0000000-0000-4000-8000-000000000005', 'LOP_PHANH',   'Lốp & phanh',      'Thay lốp, kiểm tra hệ thống phanh và cân chỉnh độ chùm.', NOW(6))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DANH MỤC DỊCH VỤ
-- ─────────────────────────────────────────────────────────────────────────────
-- duration_minutes / required_techs là contract với booking-service
-- (booking-service/PLAN.md §3.1) — không được để 0.
INSERT INTO `services`
  (`id`, `category_id`, `code`, `name`, `duration_minutes`, `required_techs`,
   `base_labor_price`, `is_active`, `created_at`, `updated_at`) VALUES
('51000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'SV-OIL-001', 'Thay dầu & lọc gió',        30,  1,  350000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'SV-OIL-002', 'Thay dầu máy & lọc nhiên liệu', 45,  1,  480000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'SV-BATT-001','Thay ắc quy',                 20,  1,  250000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'SV-BRAKE-001','Kiểm tra hệ thống phanh',     40,  1,  400000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'SV-REP-001', 'Sửa chữa hệ thống phanh',     90,  2, 1200000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000002', 'SV-SUSP-001','Sửa chữa hệ thống treo',      120, 2, 1500000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000002', 'SV-ENG-001', 'Sửa chữa động cơ',           180, 2, 2500000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000003', 'SV-SPR-001', 'Sơn toàn thân',               480, 3, 6500000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000003', 'SV-SPD-001', 'Đánh bóng & phục hồi sơn',   180, 1, 1800000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000003', 'SV-DTL-001', 'Detailing nội thất',            120, 1, 1200000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000004', 'SV-AC-001',  'Vệ sinh & bảo dưỡng điều hòa', 60, 1,  700000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000012', 'c0000000-0000-4000-8000-000000000004', 'SV-ELEC-001','Kiểm tra hệ thống điện',       45, 1,  550000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000013', 'c0000000-0000-4000-8000-000000000005', 'SV-TIRE-001','Thay lốp & cân bằng',         60, 1,  450000.00, TRUE, NOW(6), NOW(6)),
('51000000-0000-4000-8000-000000000014', 'c0000000-0000-4000-8000-000000000005', 'SV-ALIGN-001','Cân chỉnh góc chiếu',         75, 1,  650000.00, TRUE, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `duration_minutes` = VALUES(`duration_minutes`),
  `required_techs` = VALUES(`required_techs`),
  `base_labor_price` = VALUES(`base_labor_price`),
  `updated_at` = NOW(6);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. NHÓM PHỤ TÙNG
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `part_categories` (`id`, `code`, `name`, `description`, `created_at`) VALUES
('d0000000-0000-4000-8000-000000000001', 'LOC_DAU',   'Lọc dầu / Lọc gió',  'Bộ lọc dầu máy và lọc gió cho các dòng xe phổ thông.', NOW(6)),
('d0000000-0000-4000-8000-000000000002', 'LOC_NHIEN', 'Lọc nhiên liệu',     'Bộ lọc nhiên liệu động cơ diesel và xăng.', NOW(6)),
('d0000000-0000-4000-8000-000000000003', 'AC_QUY',    'Ắc quy',             'Ắc quy 12V cho xe phổ thông.', NOW(6)),
('d0000000-0000-4000-8000-000000000004', 'DEN_PHA',   'Đèn / Pha',           'Bóng đèn và cụm pha đèn trước.', NOW(6)),
('d0000000-0000-4000-8000-000000000005', 'NOI_THAT',  'Nội thất',           'Phụ kiện nội thất: thảm, chụp, khay hành lý.', NOW(6)),
('d0000000-0000-4000-8000-000000000006', 'PK_NGOAI',  'Phụ kiện ngoại thất', 'Phụ kiện ngoại thất: nắp hộp, camera, đèn LED.', NOW(6)),
('d0000000-0000-4000-8000-000000000007', 'DAU_NHOT',  'Dầu nhớt',           'Dầu nhớt tổng hợp 0W-20 / 5W-30.', NOW(6)),
('d0000000-0000-4000-8000-000000000008', 'PHANH',     'Phanh',              'Má phanh, đĩa phanh và guối phanh.', NOW(6)),
('d0000000-0000-4000-8000-000000000009', 'LOP',       'Lốp & Vỏ',           'Lốp xe và vỏ bánh.', NOW(6))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PHỤ TÙNG
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `parts`
  (`id`, `category_id`, `sku`, `oem_code`, `name`, `brand`, `unit`,
   `cost_price`, `selling_price`, `on_hand_stock`, `reserved_stock`,
   `min_stock_level`, `is_active`, `created_at`, `updated_at`) VALUES
('61000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'PT-LOCDAU-001', '90915-YZZD1', 'Lọc dầu máy Toyota Corolla',  'Toyota',   'Cái',  85000.00,  120000.00,  120, 0, 20, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'PT-LOCGIO-001', '17820-36010', 'Lọc gió Toyota Corolla',       'Toyota',   'Cái',  70000.00,  100000.00,  100, 0, 20, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'PT-LOCNH-001',  '90915-YZZD2', 'Lọc nhiên liệu Honda Civic',  'Honda',    'Cái',  95000.00,  135000.00,   80, 0, 15, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003', 'PT-ACQUY-001',  '28800-0T020','Ắc quy 12V Enera Plus',        'Enera',    'Cái', 420000.00,  650000.00,   45, 0, 10, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000003', 'PT-ACQUY-002',  '28800-F2500','Ắc quy 12V Varta AGM',        'Varta',    'Cái', 900000.00, 1350000.00,  25, 0, 10, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000004', 'PT-DENH4-001',  '90021-2M280','Bóng đèn halogen H4 60W',      'Stanley',  'Cái',  25000.00,   45000.00,  200, 0, 50, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000004', 'PT-DENH7-001',  '90021-4D780','Bóng đèn halogen H7 55W',      'Osram',    'Cái',  65000.00,  110000.00,  150, 0, 40, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000005', 'PT-THAM-001',   'PT-FLOOR-MAT','Thảm sàn ô tô chống nước',   'Autocare', 'Bộ',  120000.00,  220000.00,   60, 0, 15, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000005', 'PT-CHUP-001',   'PT-SEAT-CVR','Bộ chụp ghế ô tô da công nghiệp', 'Autocare', 'Bộ', 280000.00,  480000.00,   40, 0, 10, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000006', 'PT-CAM-001',    'PT-DASHCAM','Camera hành trình 1080p',        'Vantrue',  'Cái', 950000.00, 1450000.00,   35, 0, 10, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000006', 'PT-LED-001',    'PT-LED-STRIP','Đèn LED ambient nội thất',    'Autocare', 'Bộ',  180000.00,  350000.00,   50, 0, 15, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000007', 'PT-DN20-001',   'PT-OIL-5W30','Dầu nhớt tổng hợp 5W-30 4L',  'Castrol',  'Can', 380000.00,  520000.00,  100, 0, 25, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000007', 'PT-DN20-002',   'PT-OIL-0W20','Dầu nhớt tổng hợp 0W-20 4L',  'Mobil',    'Can', 420000.00,  580000.00,   90, 0, 25, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000008', 'PT-MP-001',     'PT-BRK-PAD','Má phanh trước',                'Brembo',   'Bộ', 480000.00,  780000.00,   70, 0, 20, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000008', 'PT-DP-001',     'PT-DISC-BRK','Đĩa phanh trước',             'Brembo',   'Cái', 620000.00,  980000.00,   50, 0, 15, TRUE, NOW(6), NOW(6)),
('61000000-0000-4000-8000-000000000016', 'd0000000-0000-4000-8000-000000000009', 'PT-LOP-001',    '205/55R16','Lốp xe 205/55R16 91V',           'Michelin', 'Cái',1450000.00,2100000.00,   40, 0, 10, TRUE, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `brand` = VALUES(`brand`),
  `cost_price` = VALUES(`cost_price`),
  `selling_price` = VALUES(`selling_price`),
  `on_hand_stock` = VALUES(`on_hand_stock`),
  `min_stock_level` = VALUES(`min_stock_level`),
  `updated_at` = NOW(6);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ĐỊNH MỨC PHỤ TÙNG (BOM) — cho tab "Bao gồm" của ServiceDetail (mục 31)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `service_boms` (`id`, `service_id`, `part_id`, `default_quantity`, `note`, `created_at`) VALUES
('b0000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 1, 'Lọc dầu máy', NOW(6)),
('b0000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000002', 1, 'Lọc gió', NOW(6)),
('b0000000-0000-4000-8000-000000000003', '51000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000012', 1, 'Dầu nhớt 5W-30', NOW(6)),
('b0000000-0000-4000-8000-000000000004', '51000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000003', 1, 'Lọc nhiên liệu', NOW(6)),
('b0000000-0000-4000-8000-000000000005', '51000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000002', 1, 'Lọc gió', NOW(6)),
('b0000000-0000-4000-8000-000000000006', '51000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000013', 1, 'Dầu nhớt 0W-20', NOW(6)),
('b0000000-0000-4000-8000-000000000007', '51000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000004', 1, 'Ắc quy', NOW(6)),
('b0000000-0000-4000-8000-000000000008', '51000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000014', 1, 'Má phanh', NOW(6)),
('b0000000-0000-4000-8000-000000000009', '51000000-0000-4000-8000-000000000005', '61000000-0000-4000-8000-000000000014', 2, 'Má phanh trước', NOW(6)),
('b0000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000005', '61000000-0000-4000-8000-000000000015', 2, 'Đĩa phanh trước', NOW(6)),
('b0000000-0000-4000-8000-000000000011', '51000000-0000-4000-8000-000000000013', '61000000-0000-4000-8000-000000000016', 4, 'Lốp trước + sau', NOW(6)),
('b0000000-0000-4000-8000-000000000012', '51000000-0000-4000-8000-000000000007', '61000000-0000-4000-8000-000000000013', 1, 'Dầu nhớt động cơ', NOW(6))
ON DUPLICATE KEY UPDATE
  `default_quantity` = VALUES(`default_quantity`),
  `note` = VALUES(`note`);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. DÒNG XE TƯƠNG THÍCH — cho tab "Xe tương thích" của PartDetail (mục 32)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `part_vehicle_compatibilities`
  (`id`, `part_id`, `vehicle_brand`, `vehicle_model`, `year_from`, `year_to`, `created_at`) VALUES
('e0000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'Toyota', 'Corolla',  2015, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000001', 'Toyota', 'Vios',     2014, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000001', 'Toyota', 'Yaris',    2017, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000002', 'Toyota', 'Corolla',  2015, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000005', '61000000-0000-4000-8000-000000000002', 'Toyota', 'Camry',    2018, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000006', '61000000-0000-4000-8000-000000000003', 'Honda',  'Civic',    2016, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000007', '61000000-0000-4000-8000-000000000003', 'Honda',  'City',     2015, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000008', '61000000-0000-4000-8000-000000000004', 'Toyota', 'Vios',     2014, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000009', '61000000-0000-4000-8000-000000000005', 'Mazda',  'BT-50',    2019, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000006', 'Honda',  'Civic',    2016, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000011', '61000000-0000-4000-8000-000000000006', 'Honda',  'City',     2015, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000012', '61000000-0000-4000-8000-000000000007', 'Ford',   'Ranger',   2019, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000013', '61000000-0000-4000-8000-000000000014', 'Toyota', 'Corolla',  2015, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000014', '61000000-0000-4000-8000-000000000014', 'Honda',  'Civic',    2016, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000015', '61000000-0000-4000-8000-000000000015', 'Toyota', 'Corolla',  2015, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000016', '61000000-0000-4000-8000-000000000016', 'Toyota', 'Corolla',  2015, 2024, NOW(6)),
('e0000000-0000-4000-8000-000000000017', '61000000-0000-4000-8000-000000000016', 'Honda',  'Civic',    2016, 2024, NOW(6))
ON DUPLICATE KEY UPDATE
  `vehicle_brand` = VALUES(`vehicle_brand`),
  `vehicle_model` = VALUES(`vehicle_model`),
  `year_from` = VALUES(`year_from`),
  `year_to` = VALUES(`year_to`);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. NHÀ CUNG CẤP
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO `suppliers`
  (`id`, `code`, `name`, `tax_code`, `phone`, `email`, `address`,
   `is_active`, `created_at`, `updated_at`) VALUES
('71000000-0000-4000-8000-000000000001', 'SUP-TYC', 'Tổng công ty Toyota Việt Nam', '0100109101', '028-38220000', 'parts@toyota.com.vn', 'Số 4 Võ Văn Kiệt, Bến Thành, Quận 1, TP.HCM', TRUE, NOW(6), NOW(6)),
('71000000-0000-4000-8000-000000000002', 'SUP-HON', 'Tổng công ty Honda Việt Nam',  '0100109102', '028-38240000', 'parts@honda.com.vn', 'Số 8 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', TRUE, NOW(6), NOW(6)),
('71000000-0000-4000-8000-000000000003', 'SUP-CST', 'Castrol Vietnam',            '0312345678', '028-38290000', 'sales@castrol.com.vn', 'Lầu 8, Tòa nhà Mplaza, 39 Lê Duẩn, Quận 1, TP.HCM', TRUE, NOW(6), NOW(6)),
('71000000-0000-4000-8000-000000000004', 'SUP-AUT', 'AutoCare Parts Warehouse',   NULL,          '090-123-4567',  'warehouse@autocare.vn', 'KCN Thanh Long, Quốc Lộ 1A, Hoàng Mai, Hà Nội', TRUE, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `phone` = VALUES(`phone`),
  `email` = VALUES(`email`),
  `address` = VALUES(`address`),
  `updated_at` = NOW(6);

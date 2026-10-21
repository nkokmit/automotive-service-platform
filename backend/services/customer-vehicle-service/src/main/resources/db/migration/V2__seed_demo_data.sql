-- Dữ liệu mẫu (demo) cho customer-vehicle-service.
--
-- LOCAL DEVELOPMENT ONLY. Dữ liệu giả lập cho môi trường dev/demo, không dùng
-- cho production. Migration này KHÔNG thể tự động bỏ qua ở production vì
-- application.yaml chỉ cấu hình một Flyway location
-- (classpath:db/migration) — cùng convention với V4__seed_data.sql của
-- user-service. Nếu cần tách dữ liệu demo khỏi production, phải đổi sang
-- location riêng cho profile dev ở cấu hình, không sửa file này.
--
-- GLOBAL_RULES §7: mỗi thay đổi tạo migration mới, không sửa migration đã
-- dùng. V1 tạo schema và đã được chia sẻ nên giữ nguyên.
--
-- Idempotent: mọi INSERT đều có điều kiện NOT EXISTS theo id, nên chạy lại
-- trên database đã có dữ liệu sẽ không sinh bản ghi trùng.
--
-- Dữ liệu mẫu cố ý bao phủ các trạng thái để có thể kiểm thử thủ công:
--   - is_active = FALSE (xe/khách vẫn hiển thị) khác với soft delete;
--   - khách hàng đã xoá mềm (deleted_at) — mọi truy vấn JPA tự loại bỏ;
--   - VIN NULL (xe chưa có VIN đăng ký);
--   - CUSTOMER_REPORTED không có garage_name (khách tự kể, chưa xác minh);
--   - customer.user_id NULL và một bản ghi trỏ tới tài khoản admin có thật
--     của user-service (10000000-...-0001 trong V4__seed_data.sql) để minh
--     hoạ field liên service; không có foreign key nên ID không tồn tại vẫn OK.

-- 1. Khách hàng.
INSERT INTO customers (id, user_id, full_name, phone, email, address, notes, is_active, created_at, updated_at, deleted_at)
SELECT seed.id, seed.user_id, seed.full_name, seed.phone, seed.email, seed.address, seed.notes,
       seed.is_active, seed.created_at, seed.created_at, seed.deleted_at
FROM (
    SELECT '40000000-0000-0000-0000-000000000001' AS id,
           '10000000-0000-0000-0000-000000000001' AS user_id,
           'Nguyễn Văn An' AS full_name,
           '0901234567' AS phone,
           'an.nguyen@example.com' AS email,
           '12 Lê Lợi, Quận 1, TP. Hồ Chí Minh' AS address,
           'Khách hàng thân thiết, ưu tiên nhắc lịch bảo dưỡng định kỳ.' AS notes,
           TRUE AS is_active,
           '2025-01-05 09:00:00' AS created_at,
           NULL AS deleted_at
    UNION ALL SELECT '40000000-0000-0000-0000-000000000002', NULL,
           'Trần Thị Bình', '0912345678', 'binh.tran@example.com',
           '45 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
           NULL, TRUE, '2025-03-18 14:30:00', NULL
    UNION ALL SELECT '40000000-0000-0000-0000-000000000003', NULL,
           'Lê Quốc Cường', '0923456789', 'cuong.le@example.com',
           '8 Trần Phú, Hà Nội', NULL, TRUE, '2025-06-02 10:15:00', NULL
    UNION ALL SELECT '40000000-0000-0000-0000-000000000004', NULL,
           'Phạm Thu Dung', '0934567890', 'dung.pham@example.com',
           '210 Điện Biên Phủ, Quận 3, TP. Hồ Chí Minh',
           'Tạm ngừng sử dụng, xe đang gửi bảo dưỡng.', FALSE, '2025-08-11 16:45:00', NULL
    -- Đã xoá mềm: vẫn còn dòng dữ liệu để audit, mọi truy vấn JPA bỏ qua.
    UNION ALL SELECT '40000000-0000-0000-0000-000000000005', NULL,
           'Võ Hải Đăng', '0945678901', NULL,
           '77 Lý Thường Kiệt, Quận 5, TP. Hồ Chí Minh', NULL, TRUE,
           '2024-11-20 08:20:00', '2025-09-30 11:00:00'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM customers existing WHERE existing.id = seed.id);

-- 2. Xe. Bỏ trống ở bản ghi cuối vì customers.id của khách đã xoá mềm không
-- có xe nào đi kèm (API cũng chặn xoá mềm khách khi còn xe hoạt động).
INSERT INTO vehicles (id, customer_id, license_plate, vin, make, model, model_year, trim, color, fuel_type, transmission, odometer_km, notes, is_active, created_at, updated_at, deleted_at)
SELECT seed.id, seed.customer_id, seed.license_plate, seed.vin, seed.make, seed.model, seed.model_year,
       seed.trim, seed.color, seed.fuel_type, seed.transmission, seed.odometer_km, seed.notes,
       seed.is_active, seed.created_at, seed.created_at, NULL
FROM (
    SELECT '50000000-0000-0000-0000-000000000001' AS id,
           '40000000-0000-0000-0000-000000000001' AS customer_id,
           '51H-123.45' AS license_plate,
           'JTDKN3DU5A0123456' AS vin,
           'Toyota' AS make, 'Vios' AS model, 2020 AS model_year,
           'LE' AS trim, 'Bạc' AS color, 'Xăng' AS fuel_type, 'Số sàn' AS transmission,
           45000 AS odometer_km, NULL AS notes, TRUE AS is_active,
           '2025-01-05 09:05:00' AS created_at
    UNION ALL SELECT '50000000-0000-0000-0000-000000000002',
           '40000000-0000-0000-0000-000000000001',
           '51H-678.90', '1HGCM82633A004352',
           'Honda', 'City', 2021, 'V', 'Đen', 'Xăng', 'Tự động',
           28000, NULL, TRUE, '2025-07-22 13:00:00'
    UNION ALL SELECT '50000000-0000-0000-0000-000000000003',
           '40000000-0000-0000-0000-000000000002',
           '51H-246.80', '1FTFW1ET4EFA12345',
           'Ford', 'Ranger', 2022, 'Wildtrak', 'Xám', 'Diesel', 'Tự động',
           62000, 'Xe chở hàng nặng, cần kiểm tra phuộc thường xuyên.', TRUE, '2025-04-09 10:00:00'
    -- Xe chưa đăng ký VIN: cột nullable, không áp dụng UNIQUE cho giá trị NULL.
    UNION ALL SELECT '50000000-0000-0000-0000-000000000004',
           '40000000-0000-0000-0000-000000000002',
           '30H-111.22', NULL,
           'Hyundai', 'i10', 2019, 'Convenience', 'Trắng', 'Xăng', 'Số sàn',
           51000, NULL, TRUE, '2025-05-14 15:20:00'
    -- Xe của khách hàng is_active = FALSE: vẫn trả về bình thường.
    UNION ALL SELECT '50000000-0000-0000-0000-000000000005',
           '40000000-0000-0000-0000-000000000004',
           '51H-555.66', 'KMHDH41DBFU123456',
           'Mazda', 'CX-5', 2023, 'Sport', 'Đỏ', 'Xăng', 'Tự động',
           18500, NULL, TRUE, '2025-08-11 16:50:00'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vehicles existing WHERE existing.id = seed.id);

-- 3. Lịch sử bảo dưỡng.
--
-- Cố ý KHÔNG seed bản ghi GARAGE_SERVICE: loại này do Kafka consumer ở bước 6
-- sinh ra từ Work Order hoàn thành, và work_order_id phải là ID thật từ
-- work-order-service. Seed bản ghi giả ở đây sẽ làm giảm giá trị của UNIQUE
-- uk_vehicle_service_histories_work_order_id dùng cho idempotency.
--
-- odometer_km của từng bản ghi luôn <= vehicles.odometer_km hiện tại, và các
-- bản ghi cùng xe tăng dần theo service_date.
INSERT INTO vehicle_service_histories (id, vehicle_id, work_order_id, record_type, service_date, odometer_km, summary, description, garage_name, created_at)
SELECT seed.id, seed.vehicle_id, NULL, seed.record_type, seed.service_date, seed.odometer_km,
       seed.summary, seed.description, seed.garage_name, seed.created_at
FROM (
    SELECT '60000000-0000-0000-0000-000000000001' AS id,
           '50000000-0000-0000-0000-000000000001' AS vehicle_id,
           'EXTERNAL_SERVICE' AS record_type,
           '2025-01-20 09:30:00' AS service_date,
           25000 AS odometer_km,
           'Thay dầu động cơ và lọc gió' AS summary,
           'Dầu 0W-20 theo khuyến cáo của hãng. Đã kiểm tra mức nước làm mát và bình phanh.' AS description,
           'Gara Minh Phát' AS garage_name,
           '2025-01-20 11:00:00' AS created_at
    UNION ALL SELECT '60000000-0000-0000-0000-000000000002',
           '50000000-0000-0000-0000-000000000001',
           'EXTERNAL_SERVICE', '2025-07-25 10:15:00', 35000,
           'Bảo dưỡng định kỳ 35.000 km',
           'Thay dầu, lọc gió, lọc xăng, kiểm tra phuộc và bơm xe. Thay lốp trước bị mòn.',
           'Gara Minh Phát', '2025-07-25 12:00:00'
    -- Khách tự kê nên không có tên gara, chưa được xác minh độc lập.
    UNION ALL SELECT '60000000-0000-0000-0000-000000000003',
           '50000000-0000-0000-0000-000000000001',
           'CUSTOMER_REPORTED', '2026-02-12 08:00:00', 44000,
           'Thay phuộc trước bên trái', NULL, NULL, '2026-02-12 08:00:00'
    UNION ALL SELECT '60000000-0000-0000-0000-000000000004',
           '50000000-0000-0000-0000-000000000002',
           'EXTERNAL_SERVICE', '2025-08-05 14:00:00', 28000,
           'Thay dầu máy lần đầu',
           'Bảo dưỡng xe mới 3.000 km. Kiểm tra áp suất lốp và căn chỉnh góc lái.',
           'An Phú Auto', '2025-08-05 15:30:00'
    UNION ALL SELECT '60000000-0000-0000-0000-000000000005',
           '50000000-0000-0000-0000-000000000003',
           'EXTERNAL_SERVICE', '2025-10-11 09:00:00', 40000,
           'Thay phuộc và bơm xe trước',
           'Phuộc trước xuyên rỉ, đã thay cả cặp trước và kiểm tra lại góc chỉnh.',
           'Gara Minh Phát', '2025-10-11 11:45:00'
    UNION ALL SELECT '60000000-0000-0000-0000-000000000006',
           '50000000-0000-0000-0000-000000000004',
           'CUSTOMER_REPORTED', '2025-12-01 17:30:00', 50000,
           'Thay máy phát điện', 'Mất điện khởi động buổi sáng, thay mới.', NULL, '2025-12-02 08:20:00'
    UNION ALL SELECT '60000000-0000-0000-0000-000000000007',
           '50000000-0000-0000-0000-000000000005',
           'EXTERNAL_SERVICE', '2026-03-08 10:00:00', 18500,
           'Bảo dưỡng định kỳ 18.000 km',
           'Thay dầu, lọc gió, kiểm tra lốp và phanh. Không có vấn đề gì bất thường.',
           'An Phú Auto', '2026-03-08 11:15:00'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vehicle_service_histories existing WHERE existing.id = seed.id);

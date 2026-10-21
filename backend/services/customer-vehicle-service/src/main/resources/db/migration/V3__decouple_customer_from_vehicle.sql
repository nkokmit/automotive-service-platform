-- Tách Customer khỏi khái niệm chủ sở hữu xe
-- (CUSTOMER_VEHICLE_RELATIONSHIP_CONTEXT.md).
--
-- Quyết định nghiệp vụ: Customer là hồ sơ người liên hệ / người mang xe đến
-- gara, KHÔNG phải chủ sở hữu pháp lý. Bất kỳ ai cũng có thể mang bất kỳ xe
-- nào đến, nên hệ thống không cần (và không được) suy diễn quan hệ sở hữu.
--
-- Vì vậy `vehicles.customer_id` bị bỏ hẳn. Liên kết Customer–Vehicle được ghi
-- nhận theo TỪNG LẦN TIẾP NHẬN, và bảng đã có sẵn cho việc đó là
-- `vehicle_service_histories`: mỗi dòng là một lần khách mang xe đến. Thêm
-- `customer_id` nullable vào đó cho ta đúng hai luồng truy vấn độc lập:
--
--   - Lịch sử sử dụng dịch vụ của Customer : WHERE customer_id = ?
--   - Lịch sử kỹ thuật của Vehicle        : WHERE vehicle_id  = ?
--
-- Không tạo bảng mới — cùng một dòng lịch sử phục vụ cả hai chiều.
--
-- GLOBAL_RULES §7: mỗi thay đổi tạo migration mới. V1 và V2 đã được dùng và
-- chia sẻ nên giữ nguyên, thay đổi này nằm ở V3.
--
-- Về `customer_id` có foreign key (khác `work_order_id` không có):
--   `work_order_id` trỏ sang work-order-service — cross-service nên chỉ lưu
--   ID, không FK (GLOBAL_RULES §2). Còn `customer_id` trỏ sang `customers`
--   thuộc CHÍNH service này, nên là quan hệ nội bộ và dùng FK đúng như
--   `vehicle_id`. Lợi ích cụ thể: lịch sử không bao giờ trỏ tới một khách
--   hàng không tồn tại, và entity được dùng @ManyToOne thay vì UUID thuần.
--   RESTRICT an toàn vì `customers` chỉ bị XOÁ MỀM — dòng dữ liệu không bao
--   giờ bị xoá cứng nên FK này thực tế không bao giờ kích hoạt.

-- 1. Ghi nhận khách hàng tại từng lần tiếp nhận.
--    NULL cho các bản ghi không rõ ai mang xe đến (ví dụ lịch sử ngoài bộ).
ALTER TABLE `vehicle_service_histories`
    ADD COLUMN `customer_id` VARCHAR(36) NULL AFTER `vehicle_id`,
    ADD INDEX `idx_vehicle_service_histories_customer_date` (`customer_id`, `service_date`),
    ADD CONSTRAINT `fk_vehicle_service_histories_customer`
        FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
        ON DELETE RESTRICT;

-- 2. Bỏ quan hệ sở hữu trên xe.
--    Thứ tự: DROP FK trước rồi mới drop index và column, vì index phụ thuộc
--    cột và FK phụ thuộc cả hai.
--
--    KHÔNG backfill customer_id từ vehicles.customer_id: dữ liệu demo đã được
--    xoá trước khi migration này chạy, nên không có dòng lịch sử nào để giữ.
--    Dù có dữ liệu thì cũng không nên tự động chuyển — CUSTOMER_VEHICLE... §5
--    nói rõ không chuyển khi chưa xác minh dữ liệu cũ thể hiện "khách của
--    lần tiếp nhận" chứ không phải "chủ sở hữu".
ALTER TABLE `vehicles`
    DROP FOREIGN KEY `fk_vehicles_customer`,
    DROP INDEX `idx_vehicles_customer_id`,
    DROP COLUMN `customer_id`;


-- 3. Dữ liệu mẫu bù lại (LOCAL DEVELOPMENT ONLY, cùng convention với V2).
--
-- Vì migration này bỏ `vehicles.customer_id`, V2 chạy TRƯỚC nên dữ liệu demo mà
-- V2 tạo ra không hề có `customer_id` trên lịch sử — cột đó lúc đó chưa tồn
-- tại. Mục 3 và 4 dưới đây ghi lại liên kết "ai mang xe đến" cho dữ liệu demo,
-- đồng thời minh hoạ mô hình mới.
--
-- Liên kết được viết TAY, không suy ra bằng join `vehicles.customer_id` (cột đã
-- bị drop): người viết dữ liệu demo tự quyết định ai là người mang xe tới
-- lần tiếp nhận đó. Đây đúng là điểm cốt lõi của thay đổi — cùng một xe có
-- thể xuất hiện trong lịch sử của nhiều khách hàng khác nhau.

-- 3a. Gắn khách hàng cho các bản ghi lịch sử mà V2 đã seed (idempotent):
-- chỉ ghi khi còn NULL nên chạy lại không ghi đè dữ liệu đã sửa tay.
--
--   xe ...0001 (Nguyễn Văn An)        -> 3 bản ghi
--   xe ...0002 (Trần Thị Bình)        -> 1 bản ghi
--   xe ...0003 (Lê Quốc Cường)       -> 1 bản ghi
--   xe ...0004 / ...0005 (Phạm Thu Dung, is_active=FALSE) -> 2 bản ghi
UPDATE `vehicle_service_histories`
SET `customer_id` = '40000000-0000-0000-0000-000000000001'
WHERE `customer_id` IS NULL
  AND `id` IN (
      '60000000-0000-0000-0000-000000000001',
      '60000000-0000-0000-0000-000000000002',
      '60000000-0000-0000-0000-000000000003'
  );

UPDATE `vehicle_service_histories`
SET `customer_id` = '40000000-0000-0000-0000-000000000002'
WHERE `customer_id` IS NULL
  AND `id` = '60000000-0000-0000-0000-000000000004';

UPDATE `vehicle_service_histories`
SET `customer_id` = '40000000-0000-0000-0000-000000000003'
WHERE `customer_id` IS NULL
  AND `id` = '60000000-0000-0000-0000-000000000005';

UPDATE `vehicle_service_histories`
SET `customer_id` = '40000000-0000-0000-0000-000000000004'
WHERE `customer_id` IS NULL
  AND `id` IN (
      '60000000-0000-0000-0000-000000000006',
      '60000000-0000-0000-0000-000000000007'
  );

-- 3b. Bản ghi minh hoạ cho mô hình mới: CƯỜNG mang XE CỦA AN đến bảo dưỡng.
-- Cùng một xe (50000000-...-0001) nay xuất hiện trong lịch sử của cả An
-- (mục 3a) và Cường (dưới đây). Trước thay đổi này điều đó không thể diễn ra:
-- xe chỉ có đúng một chủ sở hữu nên lịch sử của Cường về xe đó sẽ là 404.
--
-- service_date nằm giữa hai bản ghi của An (35.000 km -> 44.000 km) và
-- odometer_km <= vehicles.odometer_km hiện tại, đúng quy ước của V2.
INSERT INTO vehicle_service_histories (
    id, vehicle_id, customer_id, work_order_id, record_type, service_date,
    odometer_km, summary, description, garage_name, created_at
)
SELECT seed.id, seed.vehicle_id, seed.customer_id, NULL, seed.record_type,
       seed.service_date, seed.odometer_km, seed.summary, seed.description,
       seed.garage_name, seed.created_at
FROM (
    SELECT '60000000-0000-0000-0000-000000000008' AS id,
           '50000000-0000-0000-0000-000000000001' AS vehicle_id,
           '40000000-0000-0000-0000-000000000003' AS customer_id,
           'EXTERNAL_SERVICE' AS record_type,
           '2026-01-10 09:45:00' AS service_date,
           42500 AS odometer_km,
           'Kiểm tra hệ thống phanh' AS summary,
           'Thay má phanh trước và bổ sung nước pha. Xe được gửi hộ bởi người dùng khác chủ đăng ký.' AS description,
           'An Phú Auto' AS garage_name,
           '2026-01-10 11:00:00' AS created_at
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM vehicle_service_histories existing WHERE existing.id = seed.id
);

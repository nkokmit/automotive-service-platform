-- Schema cho customer-vehicle-service.
-- Flyway là source of truth; Hibernate chỉ validate (ddl-auto=validate).
--
-- Lưu ý về UNIQUE cho cột nullable (user_id, vin, work_order_id):
-- MySQL cho phép nhiều giá trị NULL trong một UNIQUE index, nên ràng buộc
-- "unique khi có giá trị" được đảm bảo mà vẫn cho phép nhiều bản ghi không
-- có giá trị (theo yêu cầu của PLAN.md §2).

-- 1. Bảng lưu trữ hồ sơ khách hàng.
CREATE TABLE IF NOT EXISTS `customers` (
    `id`         VARCHAR(36)  NOT NULL,
    -- ID tài khoản ở user-service: cross-service nên chỉ lưu ID, không có FK.
    `user_id`    VARCHAR(36)  NULL,
    `full_name`  VARCHAR(150) NOT NULL,
    `phone`      VARCHAR(20)  NOT NULL,
    `email`      VARCHAR(255) NULL,
    `address`    VARCHAR(500) NULL,
    `notes`      TEXT         NULL,
    -- Khách hàng còn hoạt động hay không (khác với soft delete).
    `is_active`  BOOLEAN      NOT NULL DEFAULT TRUE,
    `created_at` DATETIME(6)  NOT NULL,
    `updated_at` DATETIME(6)  NOT NULL,
    -- Soft delete: DELETE API set deleted_at, mọi truy vấn JPA tự filter.
    `deleted_at` DATETIME(6)  NULL,

    PRIMARY KEY (`id`),

    UNIQUE KEY `uk_customers_user_id` (`user_id`),
    -- phone/email cố ý KHÔNG unique: một số điện thoại có thể dùng cho nhiều
    -- hồ sơ (ví dụ vợ chồng, nhiều xe của cùng người gia đình).
    INDEX `idx_customers_phone` (`phone`),
    INDEX `idx_customers_email` (`email`),
    INDEX `idx_customers_deleted_at` (`deleted_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- 2. Bảng lưu trữ xe. Mỗi xe có đúng một chủ sở hữu hiện tại.
-- license_plate cố ý KHÔNG unique vĩnh viễn: biển số có thể được tái sử dụng
-- cho xe khác sau khi xe cũ ngừng lưu hành.
CREATE TABLE IF NOT EXISTS `vehicles` (
    `id`            VARCHAR(36)  NOT NULL,
    -- FK nội bộ: xe luôn thuộc một khách hàng.
    `customer_id`   VARCHAR(36)  NOT NULL,
    `license_plate` VARCHAR(20)  NOT NULL,
    -- VIN là định danh phương tiện, không trùng lặp khi có giá trị.
    `vin`           VARCHAR(17)  NULL,
    `make`          VARCHAR(100) NOT NULL,
    `model`         VARCHAR(100) NOT NULL,
    `model_year`    SMALLINT     NULL,
    `trim`          VARCHAR(100) NULL,
    `color`         VARCHAR(50)  NULL,
    `fuel_type`     VARCHAR(30)  NULL,
    `transmission`  VARCHAR(30)  NULL,
    -- Số km gần nhất đã ghi nhận; lịch sử km nằm ở vehicle_service_histories.
    `odometer_km`   INT UNSIGNED NULL,
    `notes`         TEXT         NULL,
    `is_active`     BOOLEAN      NOT NULL DEFAULT TRUE,
    `created_at`    DATETIME(6)  NOT NULL,
    `updated_at`    DATETIME(6)  NOT NULL,
    `deleted_at`    DATETIME(6)  NULL,

    PRIMARY KEY (`id`),

    UNIQUE KEY `uk_vehicles_vin` (`vin`),
    INDEX `idx_vehicles_customer_id` (`customer_id`),
    INDEX `idx_vehicles_license_plate` (`license_plate`),
    INDEX `idx_vehicles_deleted_at` (`deleted_at`),

    -- RESTRICT: không cho xóa cứng khách hàng khi còn xe tham chiếu.
    CONSTRAINT `fk_vehicles_customer`
        FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
        ON DELETE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- 3. Bảng lịch sử bảo dưỡng.
-- Nguồn bản ghi: GARAGE_SERVICE (qua nền tảng), EXTERNAL_SERVICE (gara bên
-- ngoài), CUSTOMER_REPORTED (khách hàng tự cung cấp).
-- Bảng này KHÔNG có soft delete: giữ nguyên dòng lịch sử để audit.
CREATE TABLE IF NOT EXISTS `vehicle_service_histories` (
    `id`            VARCHAR(36)  NOT NULL,
    -- FK nội bộ: bản ghi lịch sử luôn thuộc một xe.
    `vehicle_id`    VARCHAR(36)  NOT NULL,
    -- ID Work Order ở work-order-service: cross-service nên chỉ lưu ID, không có
    -- FK. Unique để chống tạo trùng lịch sử khi event được gửi lại (idempotency).
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
    -- Truy vấn lịch sử của một xe theo thời gian (service_date DESC).
    INDEX `idx_vehicle_service_histories_vehicle_date` (`vehicle_id`, `service_date`),

    CONSTRAINT `fk_vehicle_service_histories_vehicle`
        FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`)
        ON DELETE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
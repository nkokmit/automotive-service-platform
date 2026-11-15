-- =============================================================================
-- Flyway Migration: V1__init_work_order_schema.sql
-- Target Database: MySQL 9.7
-- Service: work-order-service
-- Description: Khởi tạo CSDL đầy đủ cho Quản lý Lệnh Sửa Chữa (Work Order) - Đã tích hợp Tracking Phụ tùng
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG LỆNH SỬA CHỮA (WORK ORDERS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `work_orders` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `booking_id` VARCHAR(36) NOT NULL,
    `customer_id` VARCHAR(36) NOT NULL,
    `vehicle_id` VARCHAR(36) NOT NULL,
    `advisor_id` VARCHAR(36) NOT NULL,
    `status` ENUM('CREATED', 'DIAGNOSING', 'PENDING_APPROVAL', 'IN_PROGRESS', 'COMPLETED', 'PENDING_PAYMENT', 'CLOSED', 'CANCELED') NOT NULL DEFAULT 'CREATED',
    `odometer_in` INT NOT NULL,
    `odometer_out` INT NULL,
    `vehicle_condition` TEXT NULL,
    `customer_note` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_work_orders_code` (`code`),
    UNIQUE KEY `uk_work_orders_booking` (`booking_id`),
    KEY `idx_wo_customer_vehicle` (`customer_id`, `vehicle_id`),
    KEY `idx_wo_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. BẢNG BÁO GIÁ (ESTIMATES)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `estimates` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `work_order_id` VARCHAR(36) NOT NULL,
    `type` ENUM('INITIAL', 'SUPPLEMENTARY') NOT NULL DEFAULT 'INITIAL',
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `total_labor_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_parts_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `created_by` VARCHAR(36) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_estimates_code` (`code`),
    KEY `idx_estimates_wo` (`work_order_id`),
    CONSTRAINT `fk_estimates_wo` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. BẢNG HẠNG MỤC DỊCH VỤ (WORK ORDER SERVICES)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `work_order_services` (
    `id` VARCHAR(36) NOT NULL,
    `estimate_id` VARCHAR(36) NOT NULL,
    `service_id` VARCHAR(36) NOT NULL,
    `snapshot_name` VARCHAR(150) NOT NULL,
    `duration_minutes` INT NOT NULL,
    `required_techs` INT NOT NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `total_price` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `assigned_tech_id` VARCHAR(36) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_wos_estimate` (`estimate_id`),
    CONSTRAINT `fk_wos_estimate` FOREIGN KEY (`estimate_id`) REFERENCES `estimates` (`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_wos_duration` CHECK (`duration_minutes` >= 0),
    CONSTRAINT `chk_wos_techs` CHECK (`required_techs` >= 0),
    CONSTRAINT `chk_wos_price` CHECK (`unit_price` >= 0 AND `total_price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. BẢNG CHI TIẾT PHỤ TÙNG (WORK ORDER PARTS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `work_order_parts` (
    `id` VARCHAR(36) NOT NULL,
    `estimate_id` VARCHAR(36) NOT NULL,
    `source_service_line_id` VARCHAR(36) NULL,
    `part_id` VARCHAR(36) NOT NULL,
    `snapshot_name` VARCHAR(150) NOT NULL,
    `snapshot_sku` VARCHAR(50) NOT NULL,
    `snapshot_unit` VARCHAR(20) NOT NULL,
    
    -- Tracking số lượng phụ tùng
    `requested_quantity` INT NOT NULL,
    `reserved_quantity` INT NOT NULL DEFAULT 0,
    `issued_quantity` INT NOT NULL DEFAULT 0,
    `released_quantity` INT NOT NULL DEFAULT 0,
    
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `total_price` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_RESERVED', 'RESERVED', 'FAILED', 'ISSUED', 'RETURNED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_wop_estimate` (`estimate_id`),
    KEY `idx_wop_source_service_line` (`source_service_line_id`),
    CONSTRAINT `fk_wop_estimate` FOREIGN KEY (`estimate_id`) REFERENCES `estimates` (`id`) ON DELETE CASCADE,
    
    -- Ràng buộc logic toán học số lượng
    CONSTRAINT `chk_wop_requested` CHECK (`requested_quantity` > 0),
    CONSTRAINT `chk_wop_reserved` CHECK (`reserved_quantity` >= 0 AND `reserved_quantity` <= `requested_quantity`),
    CONSTRAINT `chk_wop_issued` CHECK (`issued_quantity` >= 0 AND `issued_quantity` <= `reserved_quantity`),
    CONSTRAINT `chk_wop_released` CHECK (`released_quantity` >= 0 AND `released_quantity` <= `reserved_quantity`),
    CONSTRAINT `chk_wop_price` CHECK (`unit_price` >= 0 AND `total_price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. BẢNG NHẬT KÝ CHUYỂN TRẠNG THÁI (AUDIT LOG)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `work_order_status_history` (
    `id` VARCHAR(36) NOT NULL,
    `work_order_id` VARCHAR(36) NOT NULL,
    `status_from` VARCHAR(30) NULL,
    `status_to` VARCHAR(30) NOT NULL,
    `changed_by` VARCHAR(36) NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_wosh_wo` (`work_order_id`),
    CONSTRAINT `fk_wosh_wo` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Flyway Migration: V1__init_billing_schema.sql
-- Target Database: MySQL 9.7
-- Service: billing-service
-- Description: Khởi tạo CSDL cho Quản lý Hóa đơn (4 trạng thái), Thanh toán tại quầy,
--              Inbox (processed_events) và Transactional Outbox (outbox_events)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG HÓA ĐƠN (INVOICES)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `work_order_id` VARCHAR(36) NOT NULL,
    `customer_id` VARCHAR(36) NOT NULL,
    `vehicle_id` VARCHAR(36) NOT NULL,
    `subtotal_labor` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `subtotal_parts` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID') NOT NULL DEFAULT 'UNPAID',
    `note` TEXT NULL,
    `issued_by` VARCHAR(36) NULL,
    `issued_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `paid_at` DATETIME NULL,
    `voided_at` DATETIME NULL,
    `void_reason` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_invoices_code` (`code`),
    UNIQUE KEY `uk_invoices_work_order` (`work_order_id`),
    KEY `idx_invoices_customer` (`customer_id`),
    KEY `idx_invoices_vehicle` (`vehicle_id`),
    KEY `idx_invoices_status_issued` (`status`, `issued_at`),
    CONSTRAINT `chk_inv_amounts` CHECK (
        `subtotal_labor` >= 0
        AND `subtotal_parts` >= 0
        AND `discount_amount` >= 0
        AND `tax_amount` >= 0
        AND `grand_total` >= 0
    ),
    CONSTRAINT `chk_inv_paid` CHECK (`paid_amount` >= 0 AND `paid_amount` <= `grand_total`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. BẢNG CHI TIẾT HÓA ĐƠN (INVOICE ITEMS - SNAPSHOT BẤT BIẾN)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoice_items` (
    `id` VARCHAR(36) NOT NULL,
    `invoice_id` VARCHAR(36) NOT NULL,
    `item_type` ENUM('SERVICE', 'PART') NOT NULL,
    `reference_item_id` VARCHAR(36) NOT NULL,
    `catalog_id` VARCHAR(36) NOT NULL,
    `snapshot_code` VARCHAR(50) NOT NULL,
    `snapshot_name` VARCHAR(150) NOT NULL,
    `quantity` INT NOT NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `total_price` DECIMAL(15, 2) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_inv_items_ref` (`invoice_id`, `item_type`, `reference_item_id`),
    KEY `idx_inv_items_invoice` (`invoice_id`),
    CONSTRAINT `fk_inv_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_inv_item_qty` CHECK (`quantity` > 0),
    CONSTRAINT `chk_inv_item_price` CHECK (
        `unit_price` >= 0
        AND `discount_amount` >= 0
        AND `tax_rate` >= 0
        AND `total_price` >= 0
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. BẢNG GIAO DỊCH THANH TOÁN TẠI QUẦY (PAYMENTS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `invoice_id` VARCHAR(36) NOT NULL,
    `idempotency_key` VARCHAR(100) NOT NULL,
    `payment_method` ENUM('CASH', 'BANK_TRANSFER', 'CARD') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('SUCCEEDED', 'REFUNDED') NOT NULL DEFAULT 'SUCCEEDED',
    `transaction_ref` VARCHAR(100) NULL,
    `processed_by` VARCHAR(36) NOT NULL,
    `note` TEXT NULL,
    `paid_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `refunded_at` DATETIME NULL,
    `refund_reason` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_payments_code` (`code`),
    UNIQUE KEY `uk_payments_idempotency` (`idempotency_key`),
    KEY `idx_payments_invoice` (`invoice_id`),
    KEY `idx_payments_paid_at` (`paid_at`),
    CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_payments_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. BẢNG TRANSACTIONAL OUTBOX (GỬI SỰ KIỆN KAFKA BẰNG POLLING + SKIP LOCKED)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `outbox_events` (
    `id` VARCHAR(36) NOT NULL,
    `aggregate_type` VARCHAR(50) NOT NULL,
    `aggregate_id` VARCHAR(36) NOT NULL,
    `topic` VARCHAR(100) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `retry_count` INT NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `next_retry_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `sent_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    KEY `idx_outbox_polling` (`status`, `next_retry_at`, `created_at`),
    CONSTRAINT `chk_outbox_retry` CHECK (`retry_count` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. BẢNG INBOX (CHỐNG TRÙNG LẶP SỰ KIỆN KAFKA NHẬN VỀ)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `processed_events` (
    `event_id` VARCHAR(36) NOT NULL,
    `topic` VARCHAR(100) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `aggregate_id` VARCHAR(36) NULL,
    `processed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`event_id`),
    KEY `idx_processed_events_at` (`processed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

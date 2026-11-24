-- =============================================================================
-- Flyway Migration: V1__init_notification_schema.sql
-- Target Database: MySQL 9.7
-- Service: notification-service
-- Description: Khởi tạo CSDL cho Hệ thống Thông báo đa kênh (In-App SSE, Email),
--              Template động và Inbox Pattern (processed_events)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG MẪU THÔNG BÁO (NOTIFICATION TEMPLATES)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notification_templates` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `channel` ENUM('IN_APP', 'EMAIL', 'SMS', 'ZNS') NOT NULL,
    `subject_template` VARCHAR(255) NULL,
    `body_template` TEXT NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_notif_tpl_code_channel` (`code`, `channel`),
    KEY `idx_notif_tpl_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. BẢNG THÔNG BÁO TRONG ỨNG DỤNG (IN-APP NOTIFICATIONS & SSE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` VARCHAR(36) NOT NULL,
    `recipient_id` VARCHAR(36) NOT NULL,
    `recipient_type` ENUM('CUSTOMER', 'STAFF') NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `reference_type` VARCHAR(50) NULL,
    `reference_id` VARCHAR(36) NULL,
    `is_read` TINYINT(1) NOT NULL DEFAULT 0,
    `read_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_notif_recipient_read_created` (`recipient_id`, `is_read`, `created_at`),
    KEY `idx_notif_reference` (`reference_type`, `reference_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. BẢNG HÀNG ĐỢI GỬI KÊNH NGOÀI (EMAIL / SMS / ZNS - POLLING + SKIP LOCKED)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notification_deliveries` (
    `id` VARCHAR(36) NOT NULL,
    `notification_id` VARCHAR(36) NULL,
    `event_id` VARCHAR(36) NULL,
    `template_code` VARCHAR(100) NOT NULL,
    `channel` ENUM('EMAIL', 'SMS', 'ZNS') NOT NULL,
    `recipient_address` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `retry_count` INT NOT NULL DEFAULT 0,
    `next_retry_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_error` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `sent_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    KEY `idx_notif_deliv_polling` (`status`, `next_retry_at`, `created_at`),
    KEY `idx_notif_deliv_notification` (`notification_id`),
    CONSTRAINT `fk_notif_deliv_notification` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE SET NULL,
    CONSTRAINT `chk_notif_deliv_retry` CHECK (`retry_count` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. BẢNG INBOX (CHỐNG TRÙNG LẶP SỰ KIỆN KAFKA NHẬN VỀ)
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

CREATE TABLE `processed_events` (
    `event_id` VARCHAR(36) NOT NULL,
    `topic` VARCHAR(100) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `aggregate_id` VARCHAR(36) NULL,
    `processed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`event_id`),
    KEY `idx_processed_events_at` (`processed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `outbox_events` (
    `id` VARCHAR(36) NOT NULL,
    `aggregate_type` VARCHAR(50) NOT NULL,
    `aggregate_id` VARCHAR(36) NOT NULL,
    `topic` VARCHAR(100) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `retry_count` INT NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `next_retry_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `sent_at` DATETIME(6) NULL,
    PRIMARY KEY (`id`),
    KEY `idx_outbox_polling` (`status`, `next_retry_at`, `created_at`),
    CONSTRAINT `chk_outbox_retry` CHECK (`retry_count` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

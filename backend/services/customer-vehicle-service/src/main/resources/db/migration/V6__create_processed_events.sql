CREATE TABLE IF NOT EXISTS `processed_events` (
    `event_id` VARCHAR(36) NOT NULL,
    `topic` VARCHAR(100) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `aggregate_id` VARCHAR(36) NULL,
    `processed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`event_id`),
    KEY `idx_processed_events_at` (`processed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

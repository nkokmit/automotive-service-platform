CREATE TABLE `processed_reservation_requests` (
    `event_id` VARCHAR(36) NOT NULL,
    `work_order_id` VARCHAR(36) NOT NULL,
    `estimate_id` VARCHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    `failure_reason` TEXT NULL,
    `processed_at` DATETIME(6) NOT NULL,
    PRIMARY KEY (`event_id`),
    KEY `idx_processed_reservation_work_order` (`work_order_id`),
    KEY `idx_processed_reservation_estimate` (`estimate_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

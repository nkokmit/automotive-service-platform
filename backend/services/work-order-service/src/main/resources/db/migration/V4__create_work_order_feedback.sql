CREATE TABLE `work_order_feedback` (
    `id` VARCHAR(36) NOT NULL,
    `work_order_id` VARCHAR(36) NOT NULL,
    `customer_id` VARCHAR(36) NOT NULL,
    `rating` INT NOT NULL,
    `comment_text` VARCHAR(1000) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_work_order_feedback_work_order` (`work_order_id`),
    KEY `idx_work_order_feedback_created_at` (`created_at`),
    CONSTRAINT `fk_work_order_feedback_work_order`
        FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_work_order_feedback_rating` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(36),
    `token_hash` VARCHAR(64) NOT NULL,
    `expiry_date` TIMESTAMP NOT NULL,
    `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY `uk_token_hash` (`token_hash`),
    INDEX `idx_user_id` (`user_id`),

    CONSTRAINT `fk_refresh_tokens_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
);
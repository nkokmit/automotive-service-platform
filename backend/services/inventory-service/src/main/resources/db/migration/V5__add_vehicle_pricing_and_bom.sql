CREATE TABLE IF NOT EXISTS `service_vehicle_pricings` (
    `id` VARCHAR(36) NOT NULL,
    `service_id` VARCHAR(36) NOT NULL,
    `brand` VARCHAR(100) NOT NULL,
    `model` VARCHAR(100) NOT NULL DEFAULT 'ALL',
    `unit_price` DECIMAL(12,2) NOT NULL,
    `duration_minutes` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_svp_service_brand_model` (`service_id`, `brand`, `model`),
    CONSTRAINT `fk_svp_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_svp_price` CHECK (`unit_price` >= 0 AND `duration_minutes` >= 0),
    CONSTRAINT `chk_svp_brand_not_blank` CHECK (
        CHAR_LENGTH(TRIM(`brand`)) > 0 AND CHAR_LENGTH(TRIM(`model`)) > 0
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `service_boms`
    ADD COLUMN `brand` VARCHAR(100) NOT NULL DEFAULT 'ALL' AFTER `part_id`,
    ADD COLUMN `model` VARCHAR(100) NOT NULL DEFAULT 'ALL' AFTER `brand`,
    ADD UNIQUE KEY `uk_sb_service_part_vehicle` (`service_id`, `part_id`, `brand`, `model`),
    ADD KEY `idx_sb_service_vehicle` (`service_id`, `brand`, `model`),
    DROP INDEX `uk_service_part`;

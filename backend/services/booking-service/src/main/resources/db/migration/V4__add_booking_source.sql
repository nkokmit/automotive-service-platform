-- Kênh tạo booking (ONLINE / PHONE / WALK_IN) và nhân viên tạo hộ khách (NULL với booking online).
ALTER TABLE `bookings`
    ADD COLUMN `source`     VARCHAR(20) NOT NULL DEFAULT 'ONLINE' AFTER `status`,
    ADD COLUMN `created_by` VARCHAR(36) NULL AFTER `source`,
    ADD INDEX `idx_bookings_source_start` (`source`, `start_at`);

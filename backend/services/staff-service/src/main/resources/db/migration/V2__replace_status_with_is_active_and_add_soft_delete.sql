ALTER TABLE `staff_members`
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE `staff_members`
SET `is_active` = CASE WHEN `status` = 'INACTIVE' THEN FALSE ELSE TRUE END;

ALTER TABLE `staff_members`
    DROP INDEX `idx_staff_members_status`,
    DROP COLUMN `status`,
    ADD COLUMN `deleted_at` DATETIME(6) NULL,
    ADD KEY `idx_staff_members_is_active` (`is_active`),
    ADD KEY `idx_staff_members_deleted_at` (`deleted_at`);

ALTER TABLE `work_shifts`
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE `work_shifts`
SET `is_active` = CASE WHEN `status` = 'INACTIVE' THEN FALSE ELSE TRUE END;

ALTER TABLE `work_shifts`
    DROP INDEX `idx_work_shifts_status`,
    DROP COLUMN `status`,
    ADD COLUMN `deleted_at` DATETIME(6) NULL,
    ADD KEY `idx_work_shifts_is_active` (`is_active`),
    ADD KEY `idx_work_shifts_deleted_at` (`deleted_at`);

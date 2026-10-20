-- Initial schema for staff-service. Flyway owns schema changes; Hibernate validates only.

CREATE TABLE IF NOT EXISTS `staff_members` (
    `id`           VARCHAR(36)  NOT NULL,
    `user_id`      VARCHAR(36)  NULL,
    `employee_code` VARCHAR(50) NOT NULL,
    `full_name`    VARCHAR(150) NOT NULL,
    `phone`        VARCHAR(20)  NULL,
    `email`        VARCHAR(255) NULL,
    `position`     VARCHAR(100) NULL,
    `status`       VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    `created_at`   DATETIME(6)  NOT NULL,
    `updated_at`   DATETIME(6)  NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_staff_members_employee_code` (`employee_code`),
    UNIQUE KEY `uk_staff_members_user_id` (`user_id`),
    KEY `idx_staff_members_status` (`status`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `work_shifts` (
    `id`         VARCHAR(36)  NOT NULL,
    `code`       VARCHAR(50)  NOT NULL,
    `name`       VARCHAR(100) NOT NULL,
    `start_time` TIME         NOT NULL,
    `end_time`   TIME         NOT NULL,
    `status`     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(6)  NOT NULL,
    `updated_at` DATETIME(6)  NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_work_shifts_code` (`code`),
    KEY `idx_work_shifts_status` (`status`),
    CONSTRAINT `chk_work_shifts_same_day` CHECK (`start_time` < `end_time`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `staff_recurring_schedules` (
    `id`             VARCHAR(36) NOT NULL,
    `staff_id`       VARCHAR(36) NOT NULL,
    `shift_id`       VARCHAR(36) NOT NULL,
    `day_of_week`    TINYINT UNSIGNED NOT NULL,
    `effective_from` DATE NOT NULL,
    `effective_to`   DATE NULL,
    `effective_to_key` DATE GENERATED ALWAYS AS (
        COALESCE(`effective_to`, '9999-12-31')
    ) STORED,
    `created_at`     DATETIME(6) NOT NULL,
    `updated_at`     DATETIME(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_staff_schedule_exact_period`
        (`staff_id`, `shift_id`, `day_of_week`, `effective_from`, `effective_to_key`),
    KEY `idx_staff_schedule_lookup`
        (`staff_id`, `day_of_week`, `effective_from`, `effective_to`),
    CONSTRAINT `chk_staff_schedule_day_of_week` CHECK (`day_of_week` BETWEEN 1 AND 7),
    CONSTRAINT `chk_staff_schedule_effective_period`
        CHECK (`effective_to` IS NULL OR `effective_to` >= `effective_from`),
    CONSTRAINT `fk_staff_schedule_staff`
        FOREIGN KEY (`staff_id`) REFERENCES `staff_members` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_staff_schedule_shift`
        FOREIGN KEY (`shift_id`) REFERENCES `work_shifts` (`id`) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `staff_absences` (
    `id`           VARCHAR(36) NOT NULL,
    `staff_id`     VARCHAR(36) NOT NULL,
    `start_at`     DATETIME(6) NOT NULL COMMENT 'UTC instant',
    `end_at`       DATETIME(6) NOT NULL COMMENT 'UTC instant, exclusive',
    `absence_type` VARCHAR(50) NOT NULL,
    `reason`       TEXT NULL,
    `recorded_by`  VARCHAR(36) NULL COMMENT 'User Service ID; no cross-service FK',
    `created_at`   DATETIME(6) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_staff_absences_period` (`staff_id`, `start_at`, `end_at`),
    CONSTRAINT `chk_staff_absence_period` CHECK (`start_at` < `end_at`),
    CONSTRAINT `fk_staff_absence_staff`
        FOREIGN KEY (`staff_id`) REFERENCES `staff_members` (`id`) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `staff_schedule_exceptions` (
    `id`             VARCHAR(36) NOT NULL,
    `staff_id`       VARCHAR(36) NOT NULL,
    `shift_id`       VARCHAR(36) NOT NULL,
    `exception_date` DATE NOT NULL,
    `exception_type` VARCHAR(20) NOT NULL,
    `reason`         TEXT NULL,
    `created_by`     VARCHAR(36) NULL COMMENT 'User Service ID; no cross-service FK',
    `created_at`     DATETIME(6) NOT NULL,
    `updated_at`     DATETIME(6) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_staff_schedule_exception_shift_date`
        (`staff_id`, `shift_id`, `exception_date`),
    KEY `idx_staff_schedule_exceptions_date` (`staff_id`, `exception_date`),
    CONSTRAINT `chk_staff_schedule_exception_type`
        CHECK (`exception_type` IN ('CANCEL_SHIFT', 'ADD_SHIFT')),
    CONSTRAINT `fk_staff_schedule_exception_staff`
        FOREIGN KEY (`staff_id`) REFERENCES `staff_members` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_staff_schedule_exception_shift`
        FOREIGN KEY (`shift_id`) REFERENCES `work_shifts` (`id`) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

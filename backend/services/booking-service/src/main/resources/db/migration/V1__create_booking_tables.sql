-- Booking Service schema.
-- Flyway is the source of truth; Hibernate validates only.

CREATE TABLE IF NOT EXISTS `bookings` (
    `id`                   VARCHAR(36)  NOT NULL,
    `customer_id`          VARCHAR(36)  NOT NULL,
    `vehicle_id`           VARCHAR(36)  NULL,
    `work_order_id`        VARCHAR(36)  NULL,
    `license_plate_snapshot` VARCHAR(20) NOT NULL,
    `start_at`             DATETIME(6)  NOT NULL,
    `end_at`               DATETIME(6)  NOT NULL,
    `status`               VARCHAR(30)  NOT NULL,
    `customer_note`        VARCHAR(1000) NULL,
    `created_at`           DATETIME(6)  NOT NULL,
    `updated_at`           DATETIME(6)  NOT NULL,
    `cancelled_at`         DATETIME(6)  NULL,
    `checked_in_at`        DATETIME(6)  NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_bookings_work_order_id` (`work_order_id`),
    INDEX `idx_bookings_customer_start` (`customer_id`, `start_at`),
    INDEX `idx_bookings_status_start` (`status`, `start_at`),
    INDEX `idx_bookings_capacity_range` (`start_at`, `end_at`),
    INDEX `idx_bookings_vehicle_id` (`vehicle_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `booking_services` (
    `id`                              VARCHAR(36)  NOT NULL,
    `booking_id`                      VARCHAR(36)  NOT NULL,
    `service_id`                      VARCHAR(36)  NOT NULL,
    `service_name_snapshot`           VARCHAR(150) NOT NULL,
    `estimated_duration_minutes`      INT UNSIGNED NOT NULL,
    `required_technicians_snapshot`   INT UNSIGNED NOT NULL,
    `sequence_number`                 INT UNSIGNED NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_booking_services_sequence` (`booking_id`, `sequence_number`),
    INDEX `idx_booking_services_service_id` (`service_id`),

    CONSTRAINT `fk_booking_services_booking`
        FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
        ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS `booking_status_histories` (
    `id`          VARCHAR(36)  NOT NULL,
    `booking_id`  VARCHAR(36)  NOT NULL,
    `from_status` VARCHAR(30)  NULL,
    `to_status`   VARCHAR(30)  NOT NULL,
    `changed_at`  DATETIME(6)  NOT NULL,
    `reason`      VARCHAR(500) NULL,
    `changed_by`  VARCHAR(36)  NULL,

    PRIMARY KEY (`id`),
    INDEX `idx_booking_status_histories_booking_changed` (`booking_id`, `changed_at`),

    CONSTRAINT `fk_booking_status_histories_booking`
        FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
        ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

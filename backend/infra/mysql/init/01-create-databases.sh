#!/usr/bin/env bash
set -euo pipefail

PRIMARY_DB="${MYSQL_DATABASE:-user_service}"
SECONDARY_DB="${CUSTOMER_VEHICLE_MYSQL_DATABASE:-customer_vehicle_service}"
APP_USER="${MYSQL_USER:-app}"

mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${PRIMARY_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS \`${SECONDARY_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`${PRIMARY_DB}\`.* TO '${APP_USER}'@'%';
GRANT ALL PRIVILEGES ON \`${SECONDARY_DB}\`.* TO '${APP_USER}'@'%';
FLUSH PRIVILEGES;

USE \`${SECONDARY_DB}\`;
CREATE TABLE IF NOT EXISTS used_cars (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    brand       VARCHAR(100) NOT NULL,
    model       VARCHAR(100) NOT NULL,
    year        INT NOT NULL,
    price       DECIMAL(15, 0) NOT NULL,
    mileage     INT DEFAULT 0,
    color       VARCHAR(50),
    location    VARCHAR(100),
    description TEXT,
    image_url   TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_used_cars_brand (brand),
    INDEX idx_used_cars_price (price),
    INDEX idx_used_cars_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL

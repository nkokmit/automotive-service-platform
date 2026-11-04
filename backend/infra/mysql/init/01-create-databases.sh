#!/usr/bin/env bash
set -euo pipefail

CUSTOMER_VEHICLE_DB="${CUSTOMER_VEHICLE_MYSQL_DATABASE:-customer_vehicle_service}"
STAFF_DB="${STAFF_MYSQL_DATABASE:-staff_service}"
INVENTORY_DB="${INVENTORY_MYSQL_DATABASE:-inventory_service}"
BOOKING_DB="${BOOKING_MYSQL_DATABASE:-booking_service}"
APP_USER="${MYSQL_USER:-app}"

# user_service do MYSQL_DATABASE của container tạo sẵn; script này chỉ bổ sung
# các database còn lại.
MYSQL_PWD="${MYSQL_ROOT_PASSWORD}" mysql --protocol=socket -uroot <<-EOSQL
	CREATE DATABASE IF NOT EXISTS \`${CUSTOMER_VEHICLE_DB}\`;
	GRANT ALL PRIVILEGES ON \`${CUSTOMER_VEHICLE_DB}\`.* TO '${APP_USER}'@'%';
	CREATE DATABASE IF NOT EXISTS \`${STAFF_DB}\`;
	GRANT ALL PRIVILEGES ON \`${STAFF_DB}\`.* TO '${APP_USER}'@'%';
	CREATE DATABASE IF NOT EXISTS \`${INVENTORY_DB}\`;
	GRANT ALL PRIVILEGES ON \`${INVENTORY_DB}\`.* TO '${APP_USER}'@'%';
	CREATE DATABASE IF NOT EXISTS \`${BOOKING_DB}\`;
	GRANT ALL PRIVILEGES ON \`${BOOKING_DB}\`.* TO '${APP_USER}'@'%';
	FLUSH PRIVILEGES;
EOSQL

echo "Initialized databases '${CUSTOMER_VEHICLE_DB}', '${STAFF_DB}', '${INVENTORY_DB}', and '${BOOKING_DB}' for user '${APP_USER}'."

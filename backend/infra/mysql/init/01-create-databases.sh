#!/usr/bin/env bash
# Tạo database cho các microservice dùng chung MySQL container.
#
# MySQL image chỉ tự tạo một database qua biến MYSQL_DATABASE, nên các
# database thứ hai phải được tạo bằng script.
#
# Script chạy qua MySQL entrypoint khi volume trống và qua mysql-bootstrap
# mỗi khi Compose khởi động, kể cả khi volume đã tồn tại.
#
# Dùng file .sh (không phải .sql) vì entrypoint source file này trong shell,
# nhờ đó đọc được biến môi trường; file .sql không được nội suy biến.
set -euo pipefail

USER_DB="${MYSQL_DATABASE:-user_service}"
CUSTOMER_VEHICLE_DB="${CUSTOMER_VEHICLE_MYSQL_DATABASE:-customer_vehicle_service}"
STAFF_DB="${STAFF_MYSQL_DATABASE:-staff_service}"
INVENTORY_DB="${INVENTORY_MYSQL_DATABASE:-inventory_service}"
BOOKING_DB="${BOOKING_MYSQL_DATABASE:-booking_service}"
WORK_ORDER_DB="${WORK_ORDER_MYSQL_DATABASE:-work_order_service}"
APP_USER="${MYSQL_USER:-app}"

if [[ "${MYSQL_BOOTSTRAP_TCP:-false}" == "true" ]]; then
	mysql_connection=(--protocol=TCP -h 127.0.0.1)
else
	mysql_connection=(--protocol=socket)
fi

MYSQL_PWD="${MYSQL_ROOT_PASSWORD}" mysql "${mysql_connection[@]}" -uroot <<-EOSQL
	CREATE DATABASE IF NOT EXISTS \`${USER_DB}\`;
	GRANT ALL PRIVILEGES ON \`${USER_DB}\`.* TO '${APP_USER}'@'%';
	CREATE DATABASE IF NOT EXISTS \`${CUSTOMER_VEHICLE_DB}\`;
	GRANT ALL PRIVILEGES ON \`${CUSTOMER_VEHICLE_DB}\`.* TO '${APP_USER}'@'%';
	CREATE DATABASE IF NOT EXISTS \`${STAFF_DB}\`;
	GRANT ALL PRIVILEGES ON \`${STAFF_DB}\`.* TO '${APP_USER}'@'%';
	CREATE DATABASE IF NOT EXISTS \`${INVENTORY_DB}\`;
	GRANT ALL PRIVILEGES ON \`${INVENTORY_DB}\`.* TO '${APP_USER}'@'%';
	CREATE DATABASE IF NOT EXISTS \`${BOOKING_DB}\`;
	GRANT ALL PRIVILEGES ON \`${BOOKING_DB}\`.* TO '${APP_USER}'@'%';
	CREATE DATABASE IF NOT EXISTS \`${WORK_ORDER_DB}\`;
	GRANT ALL PRIVILEGES ON \`${WORK_ORDER_DB}\`.* TO '${APP_USER}'@'%';
	FLUSH PRIVILEGES;
EOSQL

echo "Initialized databases '${USER_DB}', '${CUSTOMER_VEHICLE_DB}', '${STAFF_DB}', '${INVENTORY_DB}', '${BOOKING_DB}', and '${WORK_ORDER_DB}' for user '${APP_USER}'."

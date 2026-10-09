#!/usr/bin/env bash
# Tạo database cho các microservice dùng chung MySQL container.
#
# MySQL image chỉ tự tạo một database qua biến MYSQL_DATABASE, nên các
# database thứ hai phải được tạo thủ công ở lần khởi tạo volume đầu tiên.
#
# Script này chạy bởi entrypoint của MySQL (thư mục /docker-entrypoint-initdb.d)
# và CHỈ chạy khi data volume còn trống. Nếu volume đã có dữ liệu, script không
# được chạy lại - khi đó chạy script một lần (tạo DB và grant quyền, giữ dữ liệu):
#
#   docker compose exec mysql bash /docker-entrypoint-initdb.d/01-create-databases.sh
#
# Dùng file .sh (không phải .sql) vì entrypoint source file này trong shell,
# nhờ đó đọc được biến môi trường; file .sql không được nội suy biến.
set -euo pipefail

CUSTOMER_VEHICLE_DB="${CUSTOMER_VEHICLE_MYSQL_DATABASE:-customer_vehicle_service}"
APP_USER="${MYSQL_USER:-app}"

# user_service do MYSQL_DATABASE của container tạo sẵn; script này chỉ bổ sung
# các database còn lại.
MYSQL_PWD="${MYSQL_ROOT_PASSWORD}" mysql --protocol=socket -uroot <<-EOSQL
	CREATE DATABASE IF NOT EXISTS \`${CUSTOMER_VEHICLE_DB}\`;
	GRANT ALL PRIVILEGES ON \`${CUSTOMER_VEHICLE_DB}\`.* TO '${APP_USER}'@'%';
	FLUSH PRIVILEGES;
EOSQL

echo "Initialized database '${CUSTOMER_VEHICLE_DB}' for user '${APP_USER}'."
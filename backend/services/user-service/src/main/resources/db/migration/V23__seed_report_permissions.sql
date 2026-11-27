-- Permissions for the revenue reporting module (module Báo cáo & Thống kê).
--
-- REPORT_READ → xem báo cáo doanh thu: tổng quan, xu hướng theo kỳ,
--               doanh thu theo dịch vụ / nhóm dịch vụ / phương thức thanh toán.
--
-- Chỉ có một quyền vì báo cáo là thao tác CHỈ ĐỌC — không có API ghi trong
-- module này. Việc cấp quyền ghi (INVOICE_WRITE, PAYMENT_WRITE) là quyền
-- riêng đã có sẵn trên các endpoint hóa đơn/thanh toán.

-- Permission ID nằm ngoài các dải đã dùng:
--   081-083 = notification, 091-097 = news, 0a1-0a2 = work order feedback.
INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.display_name
FROM (
    SELECT '30000000-0000-0000-0000-0000000000b1' AS id,
           'REPORT_READ' AS name, 'Read revenue reports' AS display_name
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

-- ADMIN và MANAGER xem được toàn bộ báo cáo doanh thu.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'REPORT_READ'
WHERE r.name IN ('ADMIN', 'MANAGER')
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

-- CASHIER xem được báo cáo tiền mặt — cần để đối soát quầy trong ngày.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'REPORT_READ'
WHERE r.name = 'CASHIER'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

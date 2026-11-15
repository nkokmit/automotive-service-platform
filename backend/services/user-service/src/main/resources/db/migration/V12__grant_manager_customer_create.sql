-- MANAGER tạo booking hộ khách nên cần tạo hồ sơ khách hàng mới (khách walk-in/điện thoại chưa có hồ sơ)
-- qua POST /api/customers trước khi gọi POST /api/staff/bookings với customerId.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'CUSTOMER_CREATE'
WHERE r.name = 'MANAGER' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

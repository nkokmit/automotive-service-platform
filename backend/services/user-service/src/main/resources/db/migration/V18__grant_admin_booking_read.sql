-- Cấp quyền đọc staff booking cho ADMIN.
--
-- Bối cảnh: migration V11 (seed_booking_service_permissions) chỉ cấp các quyền
-- staff booking cho MANAGER, còn ADMIN — vốn có toàn bộ quyền quản trị — lại
-- thiếu BOOKING_READ. Hậu quả: tài khoản ADMIN đăng nhập được màn hình
-- /admin/bookings và /admin (dashboard) nhưng mọi lệnh gọi
-- GET /api/staff/bookings đều trả 403.
--
-- Sửa: cấp BOOKING_READ cho ADMIN. Đây là quyền ĐỌC toàn hệ thống lịch hẹn,
-- không mở rộng quyền ghi (BOOKING_CREATE / BOOKING_STATUS_UPDATE / …) — những
-- quyền đó vẫn thuộc MANAGER và SERVICE_ADVISOR như thiết kế.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'BOOKING_READ'
WHERE r.name = 'ADMIN'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id
        AND existing.permission_id = p.id
  );

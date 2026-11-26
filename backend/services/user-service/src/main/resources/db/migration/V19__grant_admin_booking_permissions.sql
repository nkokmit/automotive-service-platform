-- Cấp đủ quyền lịch hẹn cho ADMIN.
--
-- Bối cảnh: ADMIN đăng nhập được vào toàn bộ màn hình /admin (dashboard,
-- /admin/bookings, /admin/parts, /admin/services) nhưng JWT của ADMIN chỉ chứa
-- BOOKING_READ (cấp ở V18). Các endpoint còn lại trả 403:
--   - GET  /api/bookings/availability  → cần BOOKING_AVAILABILITY_READ
--   - GET  /api/bookings/me            → cần CUSTOMER_BOOKING_READ
--   - POST /api/bookings                → cần CUSTOMER_BOOKING_CREATE
--   - POST /api/bookings/{id}/cancel    → cần CUSTOMER_BOOKING_CANCEL
--   - PATCH /api/bookings/{id}/reschedule → cần CUSTOMER_BOOKING_RESCHEDULE
--   - POST /api/staff/bookings          → cần BOOKING_CREATE
--   - POST /api/staff/bookings/{id}/cancel → cần BOOKING_CANCEL
--   - PATCH /api/staff/bookings/{id}/reschedule → cần BOOKING_RESCHEDULE
--   - PATCH /api/staff/bookings/{id}/status → cần BOOKING_STATUS_UPDATE
--   - POST /api/staff/bookings/{id}/check-in → cần BOOKING_CHECK_IN
--
-- Sửa: cấp các quyền còn thiếu cho ADMIN. Đây là quyền quản trị lịch hẹn
-- (dành cho người vận hành hệ thống), không ảnh hưởng quyền của các role khác.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'BOOKING_AVAILABILITY_READ',
    'CUSTOMER_BOOKING_CREATE',
    'CUSTOMER_BOOKING_READ',
    'CUSTOMER_BOOKING_CANCEL',
    'CUSTOMER_BOOKING_RESCHEDULE',
    'BOOKING_CREATE',
    'BOOKING_CANCEL',
    'BOOKING_RESCHEDULE',
    'BOOKING_STATUS_UPDATE',
    'BOOKING_CHECK_IN'
)
WHERE r.name = 'ADMIN'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id
        AND existing.permission_id = p.id
  );

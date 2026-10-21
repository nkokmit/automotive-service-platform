-- Thêm quyền tự phục vụ cho CUSTOMER (GET /api/customers/me, /api/vehicles/me).
--
-- GLOBAL_RULES §7: mỗi thay đổi tạo migration mới, không sửa migration đã dùng.
--
-- Bối cảnh: V5 cố ý KHÔNG cấp quyền nào cho CUSTOMER vì các API lúc đó chưa
-- lọc dữ liệu theo chủ sở hữu — cấp quyền đọc sẽ khiến khách hàng thấy dữ
-- liệu của khách hàng khác. Nay customer-vehicle-service đã có lớp lọc:
--
--   GET /api/customers/me            -> hồ sơ của chính người đăng nhập
--   GET /api/vehicles/me             -> xe của chính người đăng nhập
--   GET /api/vehicles/{id}/service-history
--                                    -> lịch sử của xe mình sở hữu, và 404
--                                       (không phải 403) với xe của người khác
--
-- CUSTOMER vẫn KHÔNG được cấp CUSTOMER_READ và VEHICLE_READ: hai quyền đó mở
-- danh sách toàn hệ thống. CUSTOMER cũng không có quyền ghi nào — việc nhập
-- lịch sử vẫn thuộc về nhân viên gara.
--
-- Chỉ SERVICE_HISTORY_READ được cấp, và endpoint này lọc theo chủ xe ở tầng
-- service (ServiceHistoryServiceImpl#requireCallerMayReadHistory).

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'SERVICE_HISTORY_READ'
WHERE r.name = 'CUSTOMER' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );
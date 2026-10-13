-- Thêm permission cho các API của customer-vehicle-service (PLAN.md bước 7).
--
-- GLOBAL_RULES §7: mỗi thay đổi tạo migration mới, không sửa migration đã dùng.
-- PLAN.md bước 4 từng ghi "không seed permission"; bước 7 yêu cầu "xác định
-- permission cụ thể từ code hiện hành, không tự đặt tên permission". Danh sách
-- dưới đây được lấy trực tiếp từ @PreAuthorize trong customer-vehicle-service:
--
--   CustomerController              CUSTOMER_READ / CREATE / UPDATE / DELETE
--   VehicleController               VEHICLE_READ  / CREATE / UPDATE / DELETE
--   VehicleServiceHistoryController SERVICE_HISTORY_READ / CREATE
--
-- ID tiếp nối dải 30000000-...-000009 của V4 (000001-000008 đã dùng cho
-- permission của user-service).

INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.display_name
FROM (
    SELECT '30000000-0000-0000-0000-000000000009' AS id, 'CUSTOMER_READ' AS name, 'Read customers' AS display_name
    UNION ALL SELECT '30000000-0000-0000-0000-000000000010', 'CUSTOMER_CREATE', 'Create customers'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000011', 'CUSTOMER_UPDATE', 'Update customers'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000012', 'CUSTOMER_DELETE', 'Soft delete customers'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000013', 'VEHICLE_READ', 'Read vehicles'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000014', 'VEHICLE_CREATE', 'Create vehicles'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000015', 'VEHICLE_UPDATE', 'Update vehicles'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000016', 'VEHICLE_DELETE', 'Soft delete vehicles'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000017', 'SERVICE_HISTORY_READ', 'Read vehicle service history'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000018', 'SERVICE_HISTORY_CREATE', 'Create vehicle service history'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

-- ADMIN: toàn bộ 10 quyền của customer-vehicle-service.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'CUSTOMER_READ', 'CUSTOMER_CREATE', 'CUSTOMER_UPDATE', 'CUSTOMER_DELETE',
    'VEHICLE_READ', 'VEHICLE_CREATE', 'VEHICLE_UPDATE', 'VEHICLE_DELETE',
    'SERVICE_HISTORY_READ', 'SERVICE_HISTORY_CREATE'
)
WHERE r.name = 'ADMIN' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

-- MANAGER và MECHANIC: quyền nghiệp vụ trong gara — xem khách hàng và xe,
-- CRUD xe, nhập/xem lịch sử bảo dưỡng. Quản lý hồ sơ khách hàng
-- (CUSTOMER_CREATE/UPDATE/DELETE) chỉ dành cho ADMIN vì đây là dữ liệu chủ
-- sở hữu, không phải dữ liệu vận hành của gara.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'CUSTOMER_READ',
    'VEHICLE_READ', 'VEHICLE_CREATE', 'VEHICLE_UPDATE', 'VEHICLE_DELETE',
    'SERVICE_HISTORY_READ', 'SERVICE_HISTORY_CREATE'
)
WHERE r.name IN ('MANAGER', 'MECHANIC') AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

-- CUSTOMER: cố ý KHÔNG gán quyền nào trong migration này.
--
-- Các API của customer-vehicle-service hiện KHÔNG lọc dữ liệu theo chủ sở
-- hữu: service layer không đọc SecurityContext, mọi truy vấn đều trả về
-- toàn bộ khách hàng/xe trong hệ thống. Cấp quyền đọc cho role CUSTOMER lúc
-- này sẽ khiến khách hàng thấy dữ liệu của khách hàng khác. Chỉ cấp quyền
-- này sau khi đã bổ sung lớp lọc theo chủ xe.

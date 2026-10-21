-- Tách quyền đọc lịch sử bảo dưỡng của CUSTOMER: chỉ được đọc lịch sử của chính mình.
--
-- GLOBAL_RULES §7: mỗi thay đổi tạo migration mới, không sửa migration đã dùng.
-- V6 đã được chia sẻ nên giữ nguyên dù nó nội dung nay đã lỗi thời.
--
-- Bối cảnh: V6 cấp SERVICE_HISTORY_READ cho CUSTOMER để phục vụ
-- `GET /api/vehicles/{id}/service-history`, endpoint lúc đó chỉ cho phép đọc
-- lịch sử của xe MÌNH SỞ HỮU. Nay customer-vehicle-service bỏ khái niệm sở hữu
-- (CUSTOMER_VEHICLE_RELATIONSHIP_CONTEXT.md): Customer là hồ sơ người liên hệ,
-- không phải chủ xe, nên cơ chế "xe của tôi" không còn tồn tại và quyền đó
-- không còn an toàn — lịch sử kỹ thuật là dữ liệu vận hành của gara, thuộc
-- nhân viên, không thuộc khách hàng.
--
-- Nên thay đổi gồm hai phần:
--
--   1. Tạo SERVICE_HISTORY_READ_SELF cho endpoint mới `GET /api/service-history/me`
--      — lọc theo `vehicle_service_histories.customer_id = caller`, tức khách
--      chỉ thấy những lần MÌNH mang xe đến. Đây là toàn bộ phạm vi đọc còn
--      lại của CUSTOMER.
--
--   2. THU hồi SERVICE_HISTORY_READ của CUSTOMER (đây là phần đảo ngược
--      hành động của V6). Sau migration này:
--        - CUSTOMER: chỉ SERVICE_HISTORY_READ_SELF
--        - ADMIN / MANAGER / MECHANIC: giữ nguyên SERVICE_HISTORY_READ
--
--      Không ảnh hưởng tới role nào khác: V5 chỉ gán SERVICE_HISTORY_READ cho
--      ba role trên, và CUSTOMER chỉ có bản ghi do V6 tạo ra.
--
-- Đây là migration thu hồi quyền, không phải thay đổi schema bảng.

-- 1. Permission mới. ID tiếp nối dải 30000000-... của V5 (đã dùng tới 000018).
INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.description
FROM (
    SELECT '30000000-0000-0000-0000-000000000019' AS id,
           'SERVICE_HISTORY_READ_SELF' AS name,
           'Read own service history' AS display_name,
           'Read service history rows where the customer is the one who brought the vehicle in' AS description
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

-- 2. Cấp cho CUSTOMER (idempotent).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'SERVICE_HISTORY_READ_SELF'
WHERE r.name = 'CUSTOMER' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

-- 3. Thu hồi SERVICE_HISTORY_READ của CUSTOMER.
--
-- Xoá hẳn bản ghi role_permissions chứ không có cờ "disabled" nào trong schema.
-- WHERE bám theo tên permission thay vì id cứng để bền vững hơn nếu permission
-- được seed lại ở DB khác (V5 đã dùng cách này).
--
-- Anti-join NOT EXISTS là điều kiện idempotency chuẩn của repo này cho phần
-- INSERT; phần DELETE thì tự nhiên đã idempotent vì xoá cả hai lần cho cùng
-- một khoá vẫn cho cùng kết quả (0 dòng sau lần đầu).
DELETE rp
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'CUSTOMER'
  AND r.deleted_at IS NULL
  AND p.name = 'SERVICE_HISTORY_READ'
  AND p.deleted_at IS NULL;

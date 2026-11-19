-- Customer-facing catalog reads.
--
-- Migration V10 (seed_inventory_service_permissions) ghi rõ "CUSTOMER receives
-- none" cho các quyền inventory-service. Nhưng web bán hàng cho khách cần
-- xem catalog dịch vụ và phụ tùng:
--   - GET /api/services, /api/service-categories  (cần SERVICE_READ)
--   - GET /api/parts,    /api/part-categories     (cần PART_READ)
--
-- Site hiện phục vụ MỘT xưởng duy nhất (AutoCare Workshop) nên khách xem
-- catalog là chuyện đọc, không phải ghi. Vì vậy chỉ cấp quyền READ cho
-- CUSTOMER — các quyền *_WRITE (SERVICE_WRITE, PART_WRITE, STOCK_WRITE…)
-- vẫn thuộc ADMIN / MANAGER / MECHANIC.
--
-- Các quyền này đã tồn tại từ V10 nên chỉ cần cấp role, không seed lại.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('SERVICE_READ', 'PART_READ')
WHERE r.name = 'CUSTOMER'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

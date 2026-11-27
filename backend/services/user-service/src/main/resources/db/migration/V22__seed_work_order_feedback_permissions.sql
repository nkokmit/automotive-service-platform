-- Permissions for the work-order feedback admin panel.
--
-- WORK_ORDER_FEEDBACK_READ   → xem danh sách đánh giá của toàn cửa hàng
-- WORK_ORDER_FEEDBACK_DELETE → xoá đánh giá (vd: nhận xét vi phạm)
--
-- ADMIN and MANAGER receive both. SERVICE_ADVISOR only receives READ, because
-- reading customer feedback is part of serving customers, but removing a
-- record from the public review feed is a management decision.

-- Permission IDs chosen to avoid collisions with the notification (081-083) and
-- news (091-095) ranges already used by earlier migrations.
INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.display_name
FROM (
    SELECT '30000000-0000-0000-0000-0000000000a1' AS id,
           'WORK_ORDER_FEEDBACK_READ' AS name, 'Read repair reviews' AS display_name
    UNION ALL SELECT '30000000-0000-0000-0000-0000000000a2',
           'WORK_ORDER_FEEDBACK_DELETE', 'Delete repair reviews'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

-- ADMIN and MANAGER may read and delete reviews.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'WORK_ORDER_FEEDBACK_READ', 'WORK_ORDER_FEEDBACK_DELETE'
)
WHERE r.name IN ('ADMIN', 'MANAGER')
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

-- SERVICE_ADVISOR may read reviews only (they advise customers directly).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'WORK_ORDER_FEEDBACK_READ'
WHERE r.name = 'SERVICE_ADVISOR'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

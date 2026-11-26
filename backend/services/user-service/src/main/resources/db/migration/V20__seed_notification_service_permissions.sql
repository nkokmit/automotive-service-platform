-- Permissions used by notification-service API authorization.

INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.display_name
FROM (
    SELECT '30000000-0000-0000-0000-000000000081' AS id,
           'NOTIFICATION_SEND' AS name, 'Send notifications' AS display_name
    UNION ALL SELECT '30000000-0000-0000-0000-000000000082',
           'NOTIFICATION_TEMPLATE_READ', 'Read notification templates'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000083',
           'NOTIFICATION_TEMPLATE_WRITE', 'Manage notification templates'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'NOTIFICATION_SEND',
    'NOTIFICATION_TEMPLATE_READ',
    'NOTIFICATION_TEMPLATE_WRITE'
)
WHERE r.name IN ('ADMIN', 'MANAGER')
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

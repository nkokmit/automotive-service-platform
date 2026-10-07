-- LOCAL DEVELOPMENT ONLY. Fixed BCrypt password: admin / Admin@123.
-- Do not run this migration against a production database.
-- Existing accounts/roles/permissions are preserved; no password is overwritten.

INSERT INTO roles (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.description
FROM (
    SELECT '20000000-0000-0000-0000-000000000001' AS id,
           'ADMIN' AS name, 'Administrator' AS display_name, 'Development administrator' AS description
    UNION ALL SELECT '20000000-0000-0000-0000-000000000002', 'MANAGER', 'Manager', 'Workshop manager'
    UNION ALL SELECT '20000000-0000-0000-0000-000000000003', 'MECHANIC', 'Mechanic', 'Workshop mechanic'
    UNION ALL SELECT '20000000-0000-0000-0000-000000000004', 'CUSTOMER', 'Customer', 'Workshop customer'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM roles existing WHERE existing.name = seed.name);

INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.display_name
FROM (
    SELECT '30000000-0000-0000-0000-000000000001' AS id, 'USER_READ' AS name, 'Read users' AS display_name
    UNION ALL SELECT '30000000-0000-0000-0000-000000000002', 'USER_CREATE', 'Create users'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000003', 'USER_UPDATE', 'Update users'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000004', 'USER_DELETE', 'Delete users'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000005', 'ROLE_READ', 'Read roles'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000006', 'ROLE_WRITE', 'Manage roles'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000007', 'PERMISSION_READ', 'Read permissions'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000008', 'PERMISSION_WRITE', 'Manage permissions'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'USER_READ', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
    'ROLE_READ', 'ROLE_WRITE', 'PERMISSION_READ', 'PERMISSION_WRITE'
)
WHERE r.name = 'ADMIN' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

INSERT INTO users (id, username, password, email, full_name, is_active)
SELECT '10000000-0000-0000-0000-000000000001', 'admin',
       '$2a$10$HfBpqLTTBM0DCHSJirRJV.tGduBg/nN5IG7tspi.J3v3pt97nneXC',
       'admin@example.com', 'Development Admin', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'admin' OR email = 'admin@example.com'
);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ADMIN' AND r.deleted_at IS NULL
WHERE u.id = '10000000-0000-0000-0000-000000000001'
  AND u.username = 'admin' AND u.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM user_roles existing
      WHERE existing.user_id = u.id AND existing.role_id = r.id
  );

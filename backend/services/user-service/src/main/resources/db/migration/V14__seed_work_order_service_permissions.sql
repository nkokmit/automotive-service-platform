-- Permissions used by work-order-service API authorization.
-- MANAGER receives Advisor and work-order management permissions. MECHANIC
-- receives only assigned service-line and part-operation permissions.

INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.display_name
FROM (
    SELECT '30000000-0000-0000-0000-000000000060' AS id,
           'WORK_ORDER_READ' AS name, 'Read work orders' AS display_name
    UNION ALL SELECT '30000000-0000-0000-0000-000000000061',
           'WORK_ORDER_CREATE', 'Create work orders'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000062',
           'WORK_ORDER_DIAGNOSIS_START', 'Start work-order diagnosis'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000063',
           'WORK_ORDER_COMPLETE', 'Complete work orders'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000064',
           'WORK_ORDER_CANCEL', 'Cancel work orders'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000065',
           'ESTIMATE_READ', 'Read estimates'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000066',
           'ESTIMATE_CREATE', 'Create estimates'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000067',
           'ESTIMATE_UPDATE', 'Update estimate items'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000068',
           'ESTIMATE_SUBMIT', 'Submit estimates'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000069',
           'ESTIMATE_DECISION_RECORD', 'Record estimate decisions'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000070',
           'SERVICE_LINE_ASSIGN', 'Assign service lines'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000071',
           'SERVICE_LINE_READ_ASSIGNED', 'Read assigned service lines'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000072',
           'SERVICE_LINE_START', 'Start assigned service lines'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000073',
           'SERVICE_LINE_COMPLETE', 'Complete assigned service lines'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000074',
           'PART_ISSUE', 'Issue reserved parts'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000075',
           'PART_RELEASE', 'Release reserved parts'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

-- ADMIN and MANAGER may perform all work-order operations.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'WORK_ORDER_READ', 'WORK_ORDER_CREATE', 'WORK_ORDER_DIAGNOSIS_START',
    'WORK_ORDER_COMPLETE', 'WORK_ORDER_CANCEL',
    'ESTIMATE_READ', 'ESTIMATE_CREATE', 'ESTIMATE_UPDATE',
    'ESTIMATE_SUBMIT', 'ESTIMATE_DECISION_RECORD',
    'SERVICE_LINE_ASSIGN', 'SERVICE_LINE_READ_ASSIGNED',
    'SERVICE_LINE_START', 'SERVICE_LINE_COMPLETE',
    'PART_ISSUE', 'PART_RELEASE'
)
WHERE r.name IN ('ADMIN', 'MANAGER')
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

-- MECHANIC may work only through assigned-line operations and part handling.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'SERVICE_LINE_READ_ASSIGNED', 'SERVICE_LINE_START', 'SERVICE_LINE_COMPLETE',
    'PART_ISSUE', 'PART_RELEASE'
)
WHERE r.name = 'MECHANIC'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

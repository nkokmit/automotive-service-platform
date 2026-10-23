-- Permissions used by staff-service @PreAuthorize rules.
-- ADMIN and MANAGER manage staff and schedules; MECHANIC can read operational
-- staff, shift, and schedule data but cannot change it.

INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.display_name
FROM (
    SELECT '30000000-0000-0000-0000-000000000020' AS id, 'STAFF_READ' AS name, 'Read staff' AS display_name
    UNION ALL SELECT '30000000-0000-0000-0000-000000000021', 'STAFF_CREATE', 'Create staff'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000022', 'STAFF_UPDATE', 'Update staff'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000023', 'STAFF_DELETE', 'Delete staff'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000024', 'WORK_SHIFT_READ', 'Read work shifts'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000025', 'WORK_SHIFT_CREATE', 'Create work shifts'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000026', 'WORK_SHIFT_UPDATE', 'Update work shifts'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000027', 'WORK_SHIFT_DELETE', 'Delete work shifts'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000028', 'STAFF_SCHEDULE_READ', 'Read staff schedules'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000029', 'STAFF_SCHEDULE_UPDATE', 'Update recurring schedules'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000030', 'STAFF_ABSENCE_READ', 'Read staff absences'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000031', 'STAFF_ABSENCE_CREATE', 'Create staff absences'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000032', 'STAFF_ABSENCE_UPDATE', 'Update staff absences'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000033', 'STAFF_ABSENCE_DELETE', 'Delete staff absences'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000034', 'STAFF_SCHEDULE_EXCEPTION_READ', 'Read schedule exceptions'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000035', 'STAFF_SCHEDULE_EXCEPTION_CREATE', 'Create schedule exceptions'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000036', 'STAFF_SCHEDULE_EXCEPTION_UPDATE', 'Update schedule exceptions'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000037', 'STAFF_SCHEDULE_EXCEPTION_DELETE', 'Delete schedule exceptions'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

-- ADMIN and MANAGER receive all staff-service permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'STAFF_READ', 'STAFF_CREATE', 'STAFF_UPDATE', 'STAFF_DELETE',
    'WORK_SHIFT_READ', 'WORK_SHIFT_CREATE', 'WORK_SHIFT_UPDATE', 'WORK_SHIFT_DELETE',
    'STAFF_SCHEDULE_READ', 'STAFF_SCHEDULE_UPDATE',
    'STAFF_ABSENCE_READ', 'STAFF_ABSENCE_CREATE', 'STAFF_ABSENCE_UPDATE', 'STAFF_ABSENCE_DELETE',
    'STAFF_SCHEDULE_EXCEPTION_READ', 'STAFF_SCHEDULE_EXCEPTION_CREATE',
    'STAFF_SCHEDULE_EXCEPTION_UPDATE', 'STAFF_SCHEDULE_EXCEPTION_DELETE'
)
WHERE r.name IN ('ADMIN', 'MANAGER') AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

-- MECHANIC may view the staff directory, work shifts, and schedules only.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'STAFF_READ', 'WORK_SHIFT_READ', 'STAFF_SCHEDULE_READ'
)
WHERE r.name = 'MECHANIC' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

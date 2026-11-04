-- Permissions used by booking-service API authorization.
-- Seed operation-specific grants: CUSTOMER for customer APIs and MANAGER only
-- for staff APIs.

INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.display_name
FROM (
    SELECT '30000000-0000-0000-0000-000000000048' AS id,
           'BOOKING_AVAILABILITY_READ' AS name, 'Read booking availability' AS display_name
    UNION ALL SELECT '30000000-0000-0000-0000-000000000049',
           'CUSTOMER_BOOKING_CREATE', 'Create customer bookings'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000050',
           'CUSTOMER_BOOKING_READ', 'Read own bookings'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000051',
           'CUSTOMER_BOOKING_CANCEL', 'Cancel own bookings'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000052',
           'CUSTOMER_BOOKING_RESCHEDULE', 'Reschedule own bookings'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000053',
           'BOOKING_READ', 'Read bookings'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000054',
           'BOOKING_CREATE', 'Create staff bookings'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000055',
           'BOOKING_CANCEL', 'Cancel bookings'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000056',
           'BOOKING_RESCHEDULE', 'Reschedule bookings'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000057',
           'BOOKING_STATUS_UPDATE', 'Update booking status'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000058',
           'BOOKING_VEHICLE_LINK', 'Link a vehicle to a booking'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000059',
           'BOOKING_CHECK_IN', 'Check in a booking'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

-- CUSTOMER receives only customer booking permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'BOOKING_AVAILABILITY_READ', 'CUSTOMER_BOOKING_CREATE',
    'CUSTOMER_BOOKING_READ', 'CUSTOMER_BOOKING_CANCEL',
    'CUSTOMER_BOOKING_RESCHEDULE'
)
WHERE r.name = 'CUSTOMER' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

-- MANAGER receives the staff booking permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'BOOKING_READ', 'BOOKING_CREATE', 'BOOKING_CANCEL', 'BOOKING_RESCHEDULE',
    'BOOKING_STATUS_UPDATE', 'BOOKING_VEHICLE_LINK', 'BOOKING_CHECK_IN'
)
WHERE r.name = 'MANAGER'
  AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

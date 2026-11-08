-- Vehicle linking is now part of the booking check-in operation.
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE name = 'BOOKING_VEHICLE_LINK'
);

DELETE FROM permissions
WHERE name = 'BOOKING_VEHICLE_LINK';

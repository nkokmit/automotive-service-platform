-- Service advisors handle garage operations but do not manage staff or billing.
INSERT INTO roles (id, name, display_name, description)
SELECT '20000000-0000-0000-0000-000000000006',
       'SERVICE_ADVISOR', 'Service Advisor', 'Workshop service advisor'
WHERE NOT EXISTS (SELECT 1 FROM roles existing WHERE existing.name = 'SERVICE_ADVISOR');

-- Advisors can check in bookings, manage work orders and estimates, and assign
-- mechanics. They can read staff availability and service catalogs, but cannot
-- perform mechanic-only service-line/part operations or staff/billing management.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'CUSTOMER_READ', 'CUSTOMER_CREATE',
    'VEHICLE_READ', 'VEHICLE_CREATE', 'VEHICLE_UPDATE', 'VEHICLE_DELETE',
    'SERVICE_HISTORY_READ', 'SERVICE_HISTORY_CREATE',
    'BOOKING_READ', 'BOOKING_CREATE', 'BOOKING_CANCEL', 'BOOKING_RESCHEDULE',
    'BOOKING_STATUS_UPDATE', 'BOOKING_CHECK_IN',
    'WORK_ORDER_READ', 'WORK_ORDER_CREATE', 'WORK_ORDER_DIAGNOSIS_START',
    'WORK_ORDER_COMPLETE', 'WORK_ORDER_CANCEL',
    'ESTIMATE_READ', 'ESTIMATE_CREATE', 'ESTIMATE_UPDATE',
    'ESTIMATE_SUBMIT', 'ESTIMATE_DECISION_RECORD',
    'SERVICE_LINE_ASSIGN',
    'STAFF_READ', 'WORK_SHIFT_READ', 'STAFF_SCHEDULE_READ',
    'SERVICE_READ', 'PART_READ'
)
WHERE r.name IN ('SERVICE_ADVISOR', 'MANAGER')
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

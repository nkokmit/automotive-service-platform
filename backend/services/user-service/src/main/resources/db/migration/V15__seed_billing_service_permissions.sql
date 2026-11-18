-- Add a dedicated cashier role and the authorities used by billing-service.

INSERT INTO roles (id, name, display_name, description)
SELECT '20000000-0000-0000-0000-000000000005',
       'CASHIER', 'Cashier', 'Cashier role'
WHERE NOT EXISTS (SELECT 1 FROM roles existing WHERE existing.name = 'CASHIER');

INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.display_name
FROM (
    SELECT '30000000-0000-0000-0000-000000000076' AS id,
           'INVOICE_READ' AS name, 'Read invoices' AS display_name
    UNION ALL SELECT '30000000-0000-0000-0000-000000000077',
           'INVOICE_WRITE', 'Manage invoices'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000078',
           'PAYMENT_READ', 'Read payments'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000079',
           'PAYMENT_WRITE', 'Record payments'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000080',
           'PAYMENT_REFUND', 'Refund payments'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

-- ADMIN and MANAGER manage all billing operations.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'INVOICE_READ', 'INVOICE_WRITE', 'PAYMENT_READ', 'PAYMENT_WRITE', 'PAYMENT_REFUND'
)
WHERE r.name IN ('ADMIN', 'MANAGER')
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

-- CASHIER can view invoices and payments and record payments, but cannot
-- change invoice discounts/void invoices or issue refunds.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('INVOICE_READ', 'PAYMENT_READ', 'PAYMENT_WRITE')
WHERE r.name = 'CASHIER'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

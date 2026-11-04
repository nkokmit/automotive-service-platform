-- Permissions used by inventory-service @PreAuthorize rules.
-- ADMIN and MANAGER manage the catalog, suppliers, purchase orders and stock.
-- MECHANIC can read the catalog and ledger and reserve/issue/release stock
-- for work orders (STOCK_WRITE). CUSTOMER receives none.

INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.display_name
FROM (
    SELECT '30000000-0000-0000-0000-000000000038' AS id, 'SERVICE_READ' AS name, 'Read service catalog' AS display_name
    UNION ALL SELECT '30000000-0000-0000-0000-000000000039', 'SERVICE_WRITE', 'Manage service catalog'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000040', 'PART_READ', 'Read parts'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000041', 'PART_WRITE', 'Manage parts'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000042', 'SUPPLIER_READ', 'Read suppliers'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000043', 'SUPPLIER_WRITE', 'Manage suppliers'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000044', 'PURCHASE_ORDER_READ', 'Read purchase orders'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000045', 'PURCHASE_ORDER_WRITE', 'Manage purchase orders'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000046', 'STOCK_WRITE', 'Reserve, issue and release stock'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000047', 'INVENTORY_TRANSACTION_READ', 'Read inventory ledger'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

-- ADMIN and MANAGER receive all inventory-service permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'SERVICE_READ', 'SERVICE_WRITE', 'PART_READ', 'PART_WRITE',
    'SUPPLIER_READ', 'SUPPLIER_WRITE', 'PURCHASE_ORDER_READ', 'PURCHASE_ORDER_WRITE',
    'STOCK_WRITE', 'INVENTORY_TRANSACTION_READ'
)
WHERE r.name IN ('ADMIN', 'MANAGER') AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

-- MECHANIC reads the catalog and ledger and moves stock for work orders.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'SERVICE_READ', 'PART_READ', 'STOCK_WRITE', 'INVENTORY_TRANSACTION_READ'
)
WHERE r.name = 'MECHANIC' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

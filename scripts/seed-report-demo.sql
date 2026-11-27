-- =============================================================================
-- Seed du lieu demo cho module Bao cao & Thong ke (billing-service)
-- Sinh ~12 thang hoa don / dong hang / thanh toan de kiem thu man hinh
-- /admin/reports: tong quan, doanh thu theo ky, theo dich vu, theo nhom dich vu,
-- va phan bo thanh toan theo phuong thuc.
--
-- Cach dung:
--   docker exec -i <mysql-container> mysql -uroot -p<password> \
--     < scripts/seed-report-demo.sql
--
-- Script IDEMPOTENT: ID sinh ra luon la MD5 (deterministic) nen chay lai nhieu
-- lan khong sinh ban ghi trung. Dung INSERT ... ON DUPLICATE KEY UPDATE de
-- cap nhat du lieu neu chay lai.
-- =============================================================================

USE billing_service;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 0. DON DECH CU (neu chay lai nhieu lan) de khong cong don doanh thu
-- -----------------------------------------------------------------------------
DELETE p FROM payments p
  JOIN invoices i ON i.id = p.invoice_id
 WHERE i.code LIKE 'INV-SEED-%';

DELETE FROM invoices WHERE code LIKE 'INV-SEED-%';

-- -----------------------------------------------------------------------------
-- 1. BANG TAM: DANH MUC DICH VU / PHU TUNG DUNG LAM NGUON GIA
--    ID giong dung voi inventory_service.services / parts de viec goi
--    inventory-service lay "nhom dich vu" hoat dong.
-- -----------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_demo_services;
DROP TEMPORARY TABLE IF EXISTS tmp_demo_parts;

CREATE TEMPORARY TABLE tmp_demo_services (
    idx   INT          NOT NULL,
    id    VARCHAR(36)  NOT NULL,
    code  VARCHAR(30)  NOT NULL,
    name  VARCHAR(150) NOT NULL,
    price DECIMAL(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_demo_services (idx, id, code, name, price) VALUES
 (1,'c4dfead7-cf91-4d3b-88e4-2cd0255716f1','SVC-OIL','Thay dau dong',350000.00),
 (2,'a4209aa3-99ff-4b8c-b894-b4b147831028','SVC-OILFILTER','Thay loc dau & vong quay',500000.00),
 (3,'b84494ff-9c5f-451c-bcff-ac8fa6804df2','SVC-BRAKE','Thay phuot phanh truoc',750000.00),
 (4,'9b4acc54-4980-4bb4-9fee-6ecc0a9f5264','SVC-BRAKEDISC','Thay dia phanh & mop phanh',1400000.00),
 (5,'d66784af-b4c5-4a57-b7f7-6f618b83d915','SVC-COOLANT','Thay nuoc lam mat',550000.00),
 (6,'7a2a3a10-b2b4-4b72-8edb-65e392c31ec4','SVC-SUSPENSION','Thay giam chan truoc',980000.00),
 (7,'cebd9401-8eb1-46f5-bdc6-3e639b1d7248','SVC-AC','Bao duong dieu hoa',650000.00),
 (8,'9d631ef2-9502-4ec6-85e4-7006aebf715e','SVC-BATTERY','Kiem tra & thay ac quy',1200000.00),
 (9,'4d6c9d67-fff9-4695-9cbe-1602d7e72dac','SVC-POLISH','Dinh bang & phoi son',1500000.00),
 (10,'ea2c5115-c292-4798-a270-95253dc67e31','SV-CAN-BANG-BANH-XE','Can bang banh xe',250000.00),
 (11,'84c1b622-8af4-4cf1-9475-10112d288e0a','SVC-PAINT','Son phoi hon toan than',6500000.00);

CREATE TEMPORARY TABLE tmp_demo_parts (
    idx   INT          NOT NULL,
    id    VARCHAR(36)  NOT NULL,
    sku   VARCHAR(50)  NOT NULL,
    name  VARCHAR(150) NOT NULL,
    price DECIMAL(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_demo_parts (idx, id, sku, name, price) VALUES
 (1,'0d9512b8-0b35-476d-9b68-20a2e978a7e8','SKU-OIL-5W30','Dau dong 5W30 4L',450000.00),
 (2,'33bec82d-3360-4ced-9284-1a3faf9eb008','SP-SMOKE-1','Loc gio Smoke v2',260000.00);

-- -----------------------------------------------------------------------------
-- 2. HOP HAI NGUON TINH TOAN (deterministic) â€” moi hoa don duoc mo ta bang
--    CRC32(seed|mth|seq) nen chay lai script cho cung ket qua.
-- -----------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_seed_invoices;
DROP TEMPORARY TABLE IF EXISTS tmp_seed_items;
DROP TEMPORARY TABLE IF EXISTS tmp_seed_payments;

CREATE TEMPORARY TABLE tmp_seed_invoices (
    mth            INT          NOT NULL,
    seq            INT          NOT NULL,
    id             VARCHAR(36)  NOT NULL,
    code           VARCHAR(50)  NOT NULL,
    work_order_id  VARCHAR(36)  NOT NULL,
    customer_id    VARCHAR(36)  NOT NULL,
    vehicle_id     VARCHAR(36)  NOT NULL,
    issued_at      DATETIME     NOT NULL,
    subtotal_labor DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    subtotal_parts DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount     DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    grand_total    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    paid_amount    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status         VARCHAR(20)  NOT NULL DEFAULT 'UNPAID',
    payment_count  INT          NOT NULL DEFAULT 0,
    pay_method_1   VARCHAR(20)  NOT NULL DEFAULT 'CASH',
    pay_method_2   VARCHAR(20)  NOT NULL DEFAULT 'CARD',
    refund_flag    TINYINT      NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TEMPORARY TABLE tmp_seed_items (
    id                VARCHAR(36)  NOT NULL,
    invoice_id        VARCHAR(36)  NOT NULL,
    item_type         VARCHAR(20)  NOT NULL DEFAULT 'SERVICE',
    reference_item_id VARCHAR(36)  NOT NULL,
    catalog_id        VARCHAR(36)  NOT NULL,
    snapshot_code     VARCHAR(50)  NOT NULL,
    snapshot_name     VARCHAR(150) NOT NULL,
    quantity          INT          NOT NULL,
    unit_price        DECIMAL(12,2) NOT NULL,
    total_price       DECIMAL(15,2) NOT NULL,
    created_at        DATETIME     NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TEMPORARY TABLE tmp_seed_payments (
    id                VARCHAR(36)  NOT NULL,
    code              VARCHAR(50)  NOT NULL,
    invoice_id        VARCHAR(36)  NOT NULL,
    idempotency_key   VARCHAR(100) NOT NULL,
    payment_method    VARCHAR(20)  NOT NULL DEFAULT 'CASH',
    amount            DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status            VARCHAR(20)  NOT NULL DEFAULT 'SUCCEEDED',
    transaction_ref   VARCHAR(100) NOT NULL,
    processed_by      VARCHAR(36)  NOT NULL,
    paid_at           DATETIME     NOT NULL,
    refunded_at       DATETIME     NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.1. Tao 12 thang x 16 hoa don = toi da 192 hoa don
INSERT INTO tmp_seed_invoices
    (mth, seq, id, code, work_order_id, customer_id, vehicle_id, issued_at)
SELECT
    m.mth,
    n.seq,
    UUID(),
    CONCAT('INV-SEED-', DATE_FORMAT(DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL -m.mth MONTH), '%Y%m'),
           '-', LPAD(n.seq, 3, '0')),
    UUID(),
    UUID(),
    UUID(),
    LEAST(
        TIMESTAMP(
            DATE_ADD(DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL -m.mth MONTH),
                     INTERVAL MOD(CRC32(CONCAT('d', m.mth, n.seq)), 27) DAY),
            SEC_TO_TIME(MOD(CRC32(CONCAT('t', m.mth, n.seq)), 86400))),
        TIMESTAMP(CURDATE(), SEC_TO_TIME(MOD(CRC32(CONCAT('now', m.mth, n.seq)), 86400)))
    )
FROM (SELECT 0 AS mth UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
      UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
      UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) m
CROSS JOIN (SELECT 1 AS seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
      UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
      UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16) n;

-- 2.2. Sinh dong hang DICH VU (1..3 dong / hoa don)
INSERT INTO tmp_seed_items
    (id, invoice_id, item_type, reference_item_id, catalog_id, snapshot_code,
     snapshot_name, quantity, unit_price, total_price, created_at)
SELECT
    UUID(),
    inv.id,
    'SERVICE',
    UUID(),
    cat.id,
    cat.code,
    cat.name,
    1 + MOD(CRC32(CONCAT('q', inv.mth, inv.seq, s.slot)), 2),
    cat.price,
    ROUND(cat.price * (1 + MOD(CRC32(CONCAT('q', inv.mth, inv.seq, s.slot)), 2)), 2),
    inv.issued_at
FROM tmp_seed_invoices inv
CROSS JOIN (SELECT 1 AS slot UNION ALL SELECT 2 UNION ALL SELECT 3) s
JOIN tmp_demo_services cat
  ON cat.idx = 1 + MOD(CRC32(CONCAT('c', inv.mth, inv.seq, s.slot)), 11)
WHERE s.slot <= 1 + MOD(CRC32(CONCAT('n', inv.mth, inv.seq)), 3);

-- 2.3. Sinh dong hang PHU TUNG (0..2 dong / hoa don)
INSERT INTO tmp_seed_items
    (id, invoice_id, item_type, reference_item_id, catalog_id, snapshot_code,
     snapshot_name, quantity, unit_price, total_price, created_at)
SELECT
    UUID(),
    inv.id,
    'PART',
    UUID(),
    cat.id,
    cat.sku,
    cat.name,
    1 + MOD(CRC32(CONCAT('q', inv.mth, inv.seq, 'P', s.slot)), 3),
    cat.price,
    ROUND(cat.price * (1 + MOD(CRC32(CONCAT('q', inv.mth, inv.seq, 'P', s.slot)), 3)), 2),
    inv.issued_at
FROM tmp_seed_invoices inv
CROSS JOIN (SELECT 1 AS slot UNION ALL SELECT 2) s
JOIN tmp_demo_parts cat
  ON cat.idx = 1 + MOD(CRC32(CONCAT('pc', inv.mth, inv.seq, s.slot)), 2)
WHERE s.slot <= MOD(CRC32(CONCAT('pn', inv.mth, inv.seq)), 3);

-- 2.4. Tinh tong tien hoa don + trang thai + thong so thanh toan
UPDATE tmp_seed_invoices inv
  JOIN (
      SELECT invoice_id,
             SUM(CASE WHEN item_type = 'SERVICE' THEN total_price ELSE 0 END) AS labor,
             SUM(CASE WHEN item_type = 'PART'    THEN total_price ELSE 0 END) AS parts
        FROM tmp_seed_items
       GROUP BY invoice_id
  ) agg ON agg.invoice_id = inv.id
SET
    inv.subtotal_labor = agg.labor,
    inv.subtotal_parts = agg.parts;

UPDATE tmp_seed_invoices inv
SET
    inv.discount_amount = CASE
        WHEN MOD(CRC32(CONCAT('disc', inv.mth, inv.seq)), 100) < 30
        THEN ROUND((inv.subtotal_labor + inv.subtotal_parts)
                   * (5 + MOD(CRC32(CONCAT('dr', inv.mth, inv.seq)), 6)) / 100, 2)
        ELSE 0.00 END;

UPDATE tmp_seed_invoices inv
SET inv.tax_amount = ROUND((inv.subtotal_labor + inv.subtotal_parts - inv.discount_amount) * 0.10, 2);

UPDATE tmp_seed_invoices inv
SET inv.grand_total = ROUND(inv.subtotal_labor + inv.subtotal_parts - inv.discount_amount + inv.tax_amount, 2);

UPDATE tmp_seed_invoices inv
SET inv.status = CASE
        WHEN MOD(CRC32(CONCAT('st', inv.mth, inv.seq)), 100) < 70  THEN 'PAID'
        WHEN MOD(CRC32(CONCAT('st', inv.mth, inv.seq)), 100) < 82  THEN 'PARTIALLY_PAID'
        WHEN MOD(CRC32(CONCAT('st', inv.mth, inv.seq)), 100) < 95  THEN 'UNPAID'
        ELSE 'VOID' END;

UPDATE tmp_seed_invoices inv
SET inv.paid_amount = CASE inv.status
        WHEN 'PAID'          THEN inv.grand_total
        WHEN 'PARTIALLY_PAID' THEN ROUND(inv.grand_total * 0.5, 2)
        ELSE 0.00 END;

UPDATE tmp_seed_invoices inv
SET inv.payment_count = CASE
        WHEN inv.paid_amount <= 0 THEN 0
        WHEN MOD(CRC32(CONCAT('pm', inv.mth, inv.seq)), 100) < 25 THEN 2
        ELSE 1 END;

UPDATE tmp_seed_invoices inv
SET inv.pay_method_1 = CASE
        WHEN MOD(CRC32(CONCAT('m1', inv.mth, inv.seq)), 100) < 40 THEN 'CASH'
        WHEN MOD(CRC32(CONCAT('m1', inv.mth, inv.seq)), 100) < 70 THEN 'CARD'
        ELSE 'BANK_TRANSFER' END;

UPDATE tmp_seed_invoices inv
SET inv.pay_method_2 = CASE
        WHEN MOD(CRC32(CONCAT('m2', inv.mth, inv.seq)), 100) < 40 THEN 'CASH'
        WHEN MOD(CRC32(CONCAT('m2', inv.mth, inv.seq)), 100) < 70 THEN 'CARD'
        ELSE 'BANK_TRANSFER' END;

UPDATE tmp_seed_invoices inv
SET inv.refund_flag = CASE
        WHEN inv.payment_count = 1 AND MOD(CRC32(CONCAT('rf', inv.mth, inv.seq)), 100) < 8 THEN 1
        ELSE 0 END;

-- 2.5. Tao giao dich thanh toan
INSERT INTO tmp_seed_payments
    (id, code, invoice_id, idempotency_key, payment_method, amount, status,
     transaction_ref, processed_by, paid_at, refunded_at)
SELECT
    UUID(),
    CONCAT('PAY-SEED-', DATE_FORMAT(inv.issued_at, '%Y%m'), '-', LPAD(inv.seq, 3, '0'), '-1'),
    inv.id,
    CONCAT('SEED-', inv.id, '-1'),
    inv.pay_method_1,
    CASE WHEN inv.payment_count = 2 THEN ROUND(inv.paid_amount / 2, 2) ELSE inv.paid_amount END,
    CASE WHEN inv.refund_flag = 1 THEN 'REFUNDED' ELSE 'SUCCEEDED' END,
    CONCAT('TX-', LEFT(inv.id, 8), '-1'),
    UUID(),
    DATE_ADD(inv.issued_at, INTERVAL MOD(CRC32(CONCAT('ph1', inv.mth, inv.seq)), 24) HOUR),
    CASE WHEN inv.refund_flag = 1
         THEN DATE_ADD(inv.issued_at, INTERVAL (MOD(CRC32(CONCAT('ph1', inv.mth, inv.seq)), 24) + 48) HOUR)
         ELSE NULL END
FROM tmp_seed_invoices inv
WHERE inv.payment_count >= 1;

INSERT INTO tmp_seed_payments
    (id, code, invoice_id, idempotency_key, payment_method, amount, status,
     transaction_ref, processed_by, paid_at, refunded_at)
SELECT
    UUID(),
    CONCAT('PAY-SEED-', DATE_FORMAT(inv.issued_at, '%Y%m'), '-', LPAD(inv.seq, 3, '0'), '-2'),
    inv.id,
    CONCAT('SEED-', inv.id, '-2'),
    inv.pay_method_2,
    inv.paid_amount - ROUND(inv.paid_amount / 2, 2),
    'SUCCEEDED',
    CONCAT('TX-', LEFT(inv.id, 8), '-2'),
    UUID(),
    DATE_ADD(inv.issued_at, INTERVAL MOD(CRC32(CONCAT('ph2', inv.mth, inv.seq)), 72) HOUR),
    NULL
FROM tmp_seed_invoices inv
WHERE inv.payment_count = 2;

-- -----------------------------------------------------------------------------
-- 3. GHI VAO BANG THAT
-- -----------------------------------------------------------------------------
INSERT INTO invoices
    (id, code, work_order_id, customer_id, vehicle_id,
     subtotal_labor, subtotal_parts, discount_amount, tax_amount, grand_total,
     paid_amount, status, note, issued_by, issued_at, paid_at, voided_at, void_reason,
     created_at, updated_at)
SELECT
    inv.id, inv.code, inv.work_order_id, inv.customer_id, inv.vehicle_id,
    inv.subtotal_labor, inv.subtotal_parts, inv.discount_amount, inv.tax_amount, inv.grand_total,
    inv.paid_amount, inv.status, 'Seed du lieu bao cao', UUID(), inv.issued_at,
    CASE WHEN inv.paid_amount > 0 THEN inv.issued_at ELSE NULL END,
    CASE WHEN inv.status = 'VOID' THEN inv.issued_at ELSE NULL END,
    CASE WHEN inv.status = 'VOID' THEN 'Hoa don seed bi huy' ELSE NULL END,
    inv.issued_at, inv.issued_at
FROM tmp_seed_invoices inv
ON DUPLICATE KEY UPDATE
    subtotal_labor  = VALUES(subtotal_labor),
    subtotal_parts  = VALUES(subtotal_parts),
    discount_amount = VALUES(discount_amount),
    tax_amount      = VALUES(tax_amount),
    grand_total     = VALUES(grand_total),
    paid_amount     = VALUES(paid_amount),
    status          = VALUES(status),
    issued_at       = VALUES(issued_at),
    updated_at      = VALUES(updated_at);

INSERT INTO invoice_items
    (id, invoice_id, item_type, reference_item_id, catalog_id, snapshot_code,
     snapshot_name, quantity, unit_price, discount_amount, tax_rate, total_price, created_at)
SELECT
    it.id, it.invoice_id, it.item_type, it.reference_item_id, it.catalog_id, it.snapshot_code,
    it.snapshot_name, it.quantity, it.unit_price, 0.00, 0.00, it.total_price, it.created_at
FROM tmp_seed_items it
ON DUPLICATE KEY UPDATE
    quantity    = VALUES(quantity),
    unit_price  = VALUES(unit_price),
    total_price = VALUES(total_price);

INSERT INTO payments
    (id, code, invoice_id, idempotency_key, payment_method, amount, status,
     transaction_ref, processed_by, note, paid_at, refunded_at, refund_reason,
     created_at, updated_at)
SELECT
    pay.id, pay.code, pay.invoice_id, pay.idempotency_key, pay.payment_method, pay.amount, pay.status,
    pay.transaction_ref, pay.processed_by, 'Seed', pay.paid_at, pay.refunded_at,
    CASE WHEN pay.status = 'REFUNDED' THEN 'Khach yeu cau hoan tien' ELSE NULL END,
    pay.paid_at, pay.paid_at
FROM tmp_seed_payments pay
ON DUPLICATE KEY UPDATE
    amount         = VALUES(amount),
    status         = VALUES(status),
    paid_at        = VALUES(paid_at),
    refunded_at    = VALUES(refunded_at),
    updated_at     = VALUES(updated_at);

DROP TEMPORARY TABLE IF EXISTS tmp_seed_invoices;
DROP TEMPORARY TABLE IF EXISTS tmp_seed_items;
DROP TEMPORARY TABLE IF EXISTS tmp_seed_payments;
DROP TEMPORARY TABLE IF EXISTS tmp_demo_services;
DROP TEMPORARY TABLE IF EXISTS tmp_demo_parts;

-- -----------------------------------------------------------------------------
-- 4. KIEM TRA KET QUA
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS so_hoa_don FROM billing_service.invoices;
SELECT COUNT(*) AS so_dong_hang FROM billing_service.invoice_items;
SELECT COUNT(*) AS so_thanh_toan FROM billing_service.payments;
SELECT DATE_FORMAT(issued_at, '%Y-%m') AS ky,
       COUNT(*) AS so_hoa_don,
       SUM(grand_total) AS doanh_thu
  FROM billing_service.invoices
 WHERE status <> 'VOID'
 GROUP BY ky
 ORDER BY ky DESC;


-- Schema cho inventory-service (catalog dịch vụ + phụ tùng + kho + mua hàng).
-- Flyway là source of truth cho schema; Hibernate chỉ validate (ddl-auto=validate).
--
-- Quy ước chung, khớp với các service khác trong project:
--   - ID: UUID lưu dạng VARCHAR(36) + @JdbcTypeCode(SqlTypes.VARCHAR).
--   - Timestamp: DATETIME(6), do JPA quản lý qua @PrePersist/@PreUpdate.
--   - Enum nghiệp vụ: VARCHAR + @Enumerated(EnumType.STRING); không dùng native
--     ENUM của MySQL để không khoá cứng giá trị trong schema.
--   - Foreign key CHỈ dùng cho quan hệ nội bộ của service này. ID thuộc
--     service khác (user-service: created_by) chỉ lưu dạng UUID, không có FK
--     (GLOBAL_RULES §2).

-- -----------------------------------------------------------------------------
-- 1. NHÓM DANH MỤC DỊCH VỤ & PHỤ TÙNG
-- -----------------------------------------------------------------------------

-- Nhóm dịch vụ (Bảo dưỡng, Sửa chữa chung, Đồng sơn, Detailing...).
CREATE TABLE IF NOT EXISTS `service_categories` (
    `id`          VARCHAR(36)  NOT NULL,
    `code`        VARCHAR(30)  NOT NULL,
    `name`        VARCHAR(100) NOT NULL,
    `description` TEXT         NULL,
    `created_at`  DATETIME(6)  NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_service_categories_code` (`code`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- Danh mục dịch vụ.
-- inventory-service sở hữu catalog dịch vụ: booking-service đọc thời lượng
-- và số kỹ thuật viên từ đây (booking-service/PLAN.md §3.1).
CREATE TABLE IF NOT EXISTS `services` (
    `id`                        VARCHAR(36)   NOT NULL,
    `category_id`               VARCHAR(36)   NOT NULL,
    `code`                      VARCHAR(30)   NOT NULL,
    `name`                      VARCHAR(150)  NOT NULL,
    -- Thời lượng ước tính (phút): contract cho booking-service.
    `duration_minutes`          INT           NOT NULL DEFAULT 30,
    -- Số kỹ thuật viên cần đồng thời: contract cho booking-service.
    `required_techs`            INT           NOT NULL DEFAULT 1,
    -- Giá công lao động chuẩn của dịch vụ (chưa gồm phụ tùng).
    `base_labor_price`          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `is_active`                 BOOLEAN       NOT NULL DEFAULT TRUE,
    `created_at`                DATETIME(6)   NOT NULL,
    `updated_at`                DATETIME(6)   NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_services_code` (`code`),
    KEY `idx_services_category` (`category_id`),
    KEY `idx_services_active` (`is_active`),
    CONSTRAINT `fk_services_category`
        FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_services_duration`
        CHECK (`duration_minutes` > 0),
    CONSTRAINT `chk_services_techs`
        CHECK (`required_techs` > 0),
    CONSTRAINT `chk_services_price`
        CHECK (`base_labor_price` >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- Nhóm phụ tùng (Dầu nhớt, Phanh, Lọc, Gầm, Điện...).
CREATE TABLE IF NOT EXISTS `part_categories` (
    `id`          VARCHAR(36)  NOT NULL,
    `code`        VARCHAR(30)  NOT NULL,
    `name`        VARCHAR(100) NOT NULL,
    `description` TEXT         NULL,
    `created_at`  DATETIME(6)  NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_part_categories_code` (`code`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- Danh mục phụ tùng.
-- on_hand_stock: tồn thực tế trong kho.
-- reserved_stock: tồn đã bị giữ chỗ cho hạng mục báo giá được duyệt.
-- Tồn khả dụng = on_hand_stock - reserved_stock (tính ở service layer).
CREATE TABLE IF NOT EXISTS `parts` (
    `id`              VARCHAR(36)   NOT NULL,
    `category_id`     VARCHAR(36)   NOT NULL,
    `sku`             VARCHAR(50)   NOT NULL,
    `oem_code`        VARCHAR(50)   NULL,
    `name`            VARCHAR(150)  NOT NULL,
    `brand`           VARCHAR(100)  NULL,
    `unit`            VARCHAR(20)   NOT NULL,
    -- Giá vốn: được tính lại theo bình quân tức thời khi nhập kho.
    `cost_price`      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `selling_price`   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `on_hand_stock`   INT           NOT NULL DEFAULT 0,
    `reserved_stock`  INT           NOT NULL DEFAULT 0,
    `min_stock_level` INT           NOT NULL DEFAULT 5,
    `is_active`       BOOLEAN       NOT NULL DEFAULT TRUE,
    `created_at`      DATETIME(6)   NOT NULL,
    `updated_at`      DATETIME(6)   NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_parts_sku` (`sku`),
    KEY `idx_parts_category` (`category_id`),
    -- Tìm kiếm theo SKU/OEM (PLAN.md §2.1).
    KEY `idx_parts_sku_oem` (`sku`, `oem_code`),
    KEY `idx_parts_oem_code` (`oem_code`),
    -- Truy vấn phụ tùng sắp hết tồn để cảnh báo nhập hàng.
    KEY `idx_parts_low_stock` (`on_hand_stock`, `min_stock_level`, `is_active`),
    CONSTRAINT `fk_parts_category`
        FOREIGN KEY (`category_id`) REFERENCES `part_categories` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_parts_cost`
        CHECK (`cost_price` >= 0),
    CONSTRAINT `chk_parts_selling`
        CHECK (`selling_price` >= 0),
    CONSTRAINT `chk_parts_on_hand`
        CHECK (`on_hand_stock` >= 0),
    CONSTRAINT `chk_parts_reserved`
        CHECK (`reserved_stock` >= 0),
    CONSTRAINT `chk_parts_min_stock`
        CHECK (`min_stock_level` >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- Định mức vật tư đi kèm dịch vụ (BOM - Bill of Materials).
-- Quan hệ nội bộ của service này nên dùng foreign key thật.
CREATE TABLE IF NOT EXISTS `service_boms` (
    `id`               VARCHAR(36) NOT NULL,
    `service_id`       VARCHAR(36) NOT NULL,
    `part_id`          VARCHAR(36) NOT NULL,
    `default_quantity` INT         NOT NULL DEFAULT 1,
    `note`             VARCHAR(255) NULL,
    `created_at`       DATETIME(6) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_service_part` (`service_id`, `part_id`),
    KEY `idx_boms_part` (`part_id`),
    CONSTRAINT `fk_boms_service`
        FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_boms_part`
        FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_boms_quantity`
        CHECK (`default_quantity` > 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- Độ tương thích phụ tùng với dòng xe.
-- Xe nằm ở customer-vehicle-service: cross-service nên chỉ lưu chuỗi hãng/dòng,
-- không có foreign key và không tạo JPA relationship (GLOBAL_RULES §2).
CREATE TABLE IF NOT EXISTS `part_vehicle_compatibilities` (
    `id`            VARCHAR(36) NOT NULL,
    `part_id`       VARCHAR(36) NOT NULL,
    `vehicle_brand` VARCHAR(50) NOT NULL,
    `vehicle_model` VARCHAR(50) NOT NULL,
    `year_from`     SMALLINT    NULL,
    `year_to`       SMALLINT    NULL,
    `created_at`    DATETIME(6) NOT NULL,

    PRIMARY KEY (`id`),
    KEY `idx_compat_part` (`part_id`),
    -- Lọc phụ tùng theo hãng/dòng xe tương thích.
    KEY `idx_compat_brand_model` (`vehicle_brand`, `vehicle_model`),
    CONSTRAINT `fk_compat_part`
        FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_compat_years`
        CHECK (`year_to` IS NULL OR `year_from` IS NULL OR `year_to` >= `year_from`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. NHÓM MUA HÀNG & NHẬP KHO (PURCHASE)
-- -----------------------------------------------------------------------------

-- Nhà cung cấp.
CREATE TABLE IF NOT EXISTS `suppliers` (
    `id`         VARCHAR(36)  NOT NULL,
    `code`       VARCHAR(30)  NOT NULL,
    `name`       VARCHAR(150) NOT NULL,
    `tax_code`   VARCHAR(20)  NULL,
    `phone`      VARCHAR(20)  NOT NULL,
    `email`      VARCHAR(100) NULL,
    `address`    VARCHAR(255) NULL,
    `is_active`  BOOLEAN      NOT NULL DEFAULT TRUE,
    `created_at` DATETIME(6)  NOT NULL,
    `updated_at` DATETIME(6)  NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_suppliers_code` (`code`),
    KEY `idx_suppliers_active` (`is_active`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- Đơn nhập hàng.
-- created_by là ID tài khoản ở user-service: cross-service nên chỉ lưu UUID,
-- không có foreign key (GLOBAL_RULES §2).
CREATE TABLE IF NOT EXISTS `purchase_orders` (
    `id`           VARCHAR(36)   NOT NULL,
    `code`         VARCHAR(50)   NOT NULL,
    `supplier_id`  VARCHAR(36)   NOT NULL,
    `status`       VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `created_by`   VARCHAR(36)   NOT NULL,
    `received_at`  DATETIME(6)   NULL,
    `note`         TEXT          NULL,
    `created_at`   DATETIME(6)   NOT NULL,
    `updated_at`   DATETIME(6)   NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_purchase_orders_code` (`code`),
    -- Lọc đơn theo nhà cung cấp (PLAN.md §2.1).
    KEY `idx_po_supplier` (`supplier_id`),
    KEY `idx_po_status` (`status`),
    KEY `idx_po_created_at` (`created_at`),
    CONSTRAINT `fk_po_supplier`
        FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_po_status`
        CHECK (`status` IN ('DRAFT', 'APPROVED', 'RECEIVED', 'CANCELED')),
    CONSTRAINT `chk_po_total_amount`
        CHECK (`total_amount` >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- Chi tiết đơn nhập hàng.
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
    `id`                VARCHAR(36)   NOT NULL,
    `purchase_order_id` VARCHAR(36)   NOT NULL,
    `part_id`           VARCHAR(36)   NOT NULL,
    `quantity`          INT           NOT NULL,
    `import_price`      DECIMAL(12,2) NOT NULL,
    `total_price`       DECIMAL(15,2) NOT NULL,
    `created_at`        DATETIME(6)   NOT NULL,

    PRIMARY KEY (`id`),
    KEY `idx_poi_po` (`purchase_order_id`),
    KEY `idx_poi_part` (`part_id`),
    CONSTRAINT `fk_poi_po`
        FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_poi_part`
        FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_poi_quantity`
        CHECK (`quantity` > 0),
    CONSTRAINT `chk_poi_import_price`
        CHECK (`import_price` >= 0),
    CONSTRAINT `chk_poi_total_price`
        CHECK (`total_price` >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- -----------------------------------------------------------------------------
-- 3. NHÓM SỔ NHẬT KÝ KHO (AUDIT LEDGER)
-- -----------------------------------------------------------------------------
-- Mọi biến động tồn kho đều phải có bản ghi tương ứng (PLAN.md §5.3).
-- quantity là số lượng tuyệt đối; chiều biến động do `type` quyết định:
--   IMPORT/RETURN  -> tăng tồn thực
--   EXPORT         -> giảm tồn thực
--   RESERVE        -> tăng tồn giữ chỗ (không đổi tồn thực)
--   RELEASE        -> giảm tồn giữ chỗ (không đổi tồn thực)
--   ADJUSTMENT     -> hiệu chỉnh theo chênh lệch kiểm kê
CREATE TABLE IF NOT EXISTS `inventory_transactions` (
    `id`             VARCHAR(36)   NOT NULL,
    `part_id`        VARCHAR(36)   NOT NULL,
    `type`           VARCHAR(20)   NOT NULL,
    `quantity`       INT           NOT NULL,
    `stock_before`   INT           NOT NULL,
    `stock_after`    INT           NOT NULL,
    `reference_type` VARCHAR(20)   NOT NULL,
    -- ID tham chiếu: có thể là đơn nhập hàng của service này, hoặc lệnh sửa
    -- chữa ở work-order-service (cross-service, chỉ lưu ID).
    `reference_id`   VARCHAR(36)   NOT NULL,
    `created_by`     VARCHAR(36)   NOT NULL,
    `note`           TEXT          NULL,
    `created_at`     DATETIME(6)   NOT NULL,

    PRIMARY KEY (`id`),
    -- Tra cứu sổ kho theo phụ tùng theo thời gian (PLAN.md §2.1).
    KEY `idx_trx_part_created` (`part_id`, `created_at`),
    KEY `idx_trx_reference` (`reference_type`, `reference_id`),
    KEY `idx_trx_created_at` (`created_at`),
    CONSTRAINT `fk_trx_part`
        FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_trx_type`
        CHECK (`type` IN ('IMPORT', 'EXPORT', 'RESERVE', 'RELEASE', 'RETURN', 'ADJUSTMENT')),
    CONSTRAINT `chk_trx_reference_type`
        CHECK (`reference_type` IN ('PURCHASE_ORDER', 'WORK_ORDER', 'STOCK_TAKE', 'MANUAL')),
    CONSTRAINT `chk_trx_quantity`
        CHECK (`quantity` > 0),
    CONSTRAINT `chk_trx_stock_before`
        CHECK (`stock_before` >= 0),
    CONSTRAINT `chk_trx_stock_after`
        CHECK (`stock_after` >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

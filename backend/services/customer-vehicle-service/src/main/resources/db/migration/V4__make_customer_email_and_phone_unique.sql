-- Email có thể NULL; MySQL vẫn cho phép nhiều giá trị NULL trong unique index.
-- Unique constraints bao gồm hồ sơ đã xoá mềm, cùng quy tắc hiện tại của user_id.
ALTER TABLE `customers`
    DROP INDEX `idx_customers_phone`,
    DROP INDEX `idx_customers_email`,
    ADD UNIQUE KEY `uk_customers_phone` (`phone`),
    ADD UNIQUE KEY `uk_customers_email` (`email`);

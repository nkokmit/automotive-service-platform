-- Customer contacts are not identity keys: households may share email/phone,
-- and one person may update a contact while retaining an older profile.
ALTER TABLE `customers`
    DROP INDEX `uk_customers_phone`,
    DROP INDEX `uk_customers_email`,
    ADD INDEX `idx_customers_phone` (`phone`),
    ADD INDEX `idx_customers_email` (`email`),
    MODIFY COLUMN `phone` VARCHAR(20) NULL;

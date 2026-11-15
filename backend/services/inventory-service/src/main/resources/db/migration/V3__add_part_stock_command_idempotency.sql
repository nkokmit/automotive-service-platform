ALTER TABLE `inventory_transactions`
    ADD COLUMN `idempotency_key` VARCHAR(160) NULL AFTER `reference_id`,
    ADD UNIQUE KEY `uk_inventory_transactions_idempotency_key` (`idempotency_key`);

ALTER TABLE `work_order_services`
    ADD COLUMN `completed_at` DATETIME NULL AFTER `assigned_tech_id`,
    ADD KEY `idx_wos_assigned_tech_status` (`assigned_tech_id`, `status`);

-- Thêm cột mô tả cho dịch vụ.
--
-- Bối cảnh: `services` chỉ có tên/mã/giá/thời lượng — không có mô tả. Form
-- quản trị dịch vụ có ô "Mô tả" nhưng backend không lưu, nên admin gõ mô tả xong
-- bấm lưu thì mất, và giao diện khách hàng chỉ hiện mô tả dựng sẵn theo nhóm
-- (frontend/src/data/catalog.tsx — `describeService`).
--
-- Cột `TEXT` NULL: dịch vụ cũ chưa có mô tả vẫn dùng được, hiển thị fallback.
ALTER TABLE `services`
    ADD COLUMN `description` TEXT NULL AFTER `name`;

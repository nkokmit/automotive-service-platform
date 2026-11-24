-- Bổ sung ảnh + mô tả cho phụ tùng.
--
-- `image_url`: link ảnh sản phẩm do quản trị viên nhập. Trước đây bảng `parts`
-- không có cột ảnh nên storefront phải dùng ảnh dự phòng theo nhóm.
-- `description`: mô tả sản phẩm hiển thị ở trang chi tiết phụ kiện.
ALTER TABLE `parts`
    ADD COLUMN `image_url` VARCHAR(500) NULL AFTER `brand`,
    ADD COLUMN `description` TEXT NULL AFTER `image_url`;

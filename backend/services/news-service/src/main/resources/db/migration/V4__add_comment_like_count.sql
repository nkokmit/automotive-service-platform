-- Thêm bộ đếm lượt thích vào bảng bình luận.
--
-- `like_count` là cột denormalized (cache số lượt thích) để sắp xếp bình luận
-- theo "nhiều người thích nhất" không phải JOIN bảng `news_comment_likes`
-- mỗi lần đọc. Backend tăng/giảm cột này trong cùng transaction với
-- thêm/xoá lượt thích, nên không lệch với số lượt thích thực tế.
ALTER TABLE `news_comments`
    ADD COLUMN `like_count` INT NOT NULL DEFAULT 0 AFTER `is_active`;

-- Index phục vụ sắp xếp bình luận theo lượt thích giảm dần.
CREATE INDEX `idx_news_comments_like_count` ON `news_comments` (`like_count`);

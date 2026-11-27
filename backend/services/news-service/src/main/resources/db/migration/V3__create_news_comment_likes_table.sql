-- Thích (like) bình luận bài viết.
--
-- Mỗi dòng là một lượt thích của một người dùng cho một bình luận.
-- user_id: UUID user-service — chỉ lưu UUID, không có FK (GLOBAL_RULES §2).
-- Ràng buộc UNIQUE (comment_id, user_id) để mỗi người chỉ thích 1 lần —
-- backend dùng INSERT ... ON DUPLICATE KEY / DELETE theo cặp khoá này.
CREATE TABLE IF NOT EXISTS `news_comment_likes` (
    `id`         VARCHAR(36) NOT NULL,
    `comment_id` VARCHAR(36) NOT NULL,
    `user_id`    VARCHAR(36) NOT NULL,
    `created_at` DATETIME(6) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_news_comment_likes_comment_user` (`comment_id`, `user_id`),
    KEY `idx_news_comment_likes_user` (`user_id`),
    CONSTRAINT `fk_news_comment_likes_comment`
        FOREIGN KEY (`comment_id`) REFERENCES `news_comments` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- Schema cho news-service (Tin tức: danh mục bài viết + bài viết + bình luận).
-- Flyway là source of truth cho schema; Hibernate chỉ validate (ddl-auto=validate).
--
-- Quy ước chung, khớp với các service khác trong project:
--   - ID: UUID lưu dạng VARCHAR(36) + @JdbcTypeCode(SqlTypes.VARCHAR).
--   - Timestamp: DATETIME(6), do JPA quản lý qua @PrePersist/@PreUpdate.
--   - Enum nghiệp vụ: VARCHAR + @Enumerated(EnumType.STRING); không dùng native
--     ENUM của MySQL để không khoá cứng giá trị trong schema.
--   - Foreign key CHỈ dùng cho quan hệ nội bộ của service này. ID thuộc
--     service khác (user-service: author_id, comment.user_id) chỉ lưu dạng UUID,
--     không có FK (GLOBAL_RULES §2).

-- -----------------------------------------------------------------------------
-- 1. DANH MỤC BÀI VIẾT
-- -----------------------------------------------------------------------------

-- Danh mục bài viết (Tin nức ô tô, Bảo dưỡng, Khuyến mãi, Công nghệ...).
CREATE TABLE IF NOT EXISTS `news_categories` (
    `id`          VARCHAR(36)  NOT NULL,
    `code`        VARCHAR(30)  NOT NULL,
    `name`        VARCHAR(100) NOT NULL,
    `description` TEXT         NULL,
    `created_at`  DATETIME(6)  NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_news_categories_code` (`code`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. BÀI VIẾT
-- -----------------------------------------------------------------------------

-- Bài viết tin tức.
-- status: DRAFT | PUBLISHED | ARCHIVED (VARCHAR + @Enumerated(EnumType.STRING)).
-- content: nội dung HTML do quản lý soạn, hiển thị ở trang đọc bài.
-- author_id: UUID user của người viết (thuộc user-service) — chỉ lưu UUID.
CREATE TABLE IF NOT EXISTS `news_articles` (
    `id`            VARCHAR(36)   NOT NULL,
    `category_id`   VARCHAR(36)   NOT NULL,
    `slug`          VARCHAR(200)  NOT NULL,
    `title`         VARCHAR(255)  NOT NULL,
    `summary`       TEXT          NULL,
    `content`       LONGTEXT      NULL,
    `thumbnail_url` VARCHAR(500)  NULL,
    `author_name`   VARCHAR(100)  NULL,
    `author_id`     VARCHAR(36)   NULL,
    `status`        VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    `is_featured`   BOOLEAN       NOT NULL DEFAULT FALSE,
    `view_count`    INT           NOT NULL DEFAULT 0,
    `published_at`  DATETIME(6)   NULL,
    `created_at`    DATETIME(6)   NOT NULL,
    `updated_at`    DATETIME(6)   NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_news_articles_slug` (`slug`),
    KEY `idx_news_articles_category` (`category_id`),
    KEY `idx_news_articles_status` (`status`),
    KEY `idx_news_articles_published_at` (`published_at`),
    CONSTRAINT `fk_news_articles_category`
        FOREIGN KEY (`category_id`) REFERENCES `news_categories` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_news_articles_view_count`
        CHECK (`view_count` >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- -----------------------------------------------------------------------------
-- 3. BÌNH LUẬN BÀI VIẾT
-- -----------------------------------------------------------------------------

-- Bình luận của người dùng đã đăng nhập.
-- user_id: UUID user-service — chỉ lưu UUID, không có FK.
-- parent_id: trả lời bình luận khác trong cùng bài viết.
-- is_active: soft delete — bình luận bị ẩn vẫn giữ để audit.
CREATE TABLE IF NOT EXISTS `news_comments` (
    `id`         VARCHAR(36) NOT NULL,
    `article_id` VARCHAR(36) NOT NULL,
    `user_id`    VARCHAR(36) NULL,
    `user_name`  VARCHAR(100) NULL,
    `content`    TEXT NOT NULL,
    `parent_id`  VARCHAR(36) NULL,
    `is_active`  BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` DATETIME(6) NOT NULL,
    `updated_at` DATETIME(6) NOT NULL,

    PRIMARY KEY (`id`),
    KEY `idx_news_comments_article` (`article_id`),
    KEY `idx_news_comments_parent` (`parent_id`),
    KEY `idx_news_comments_active` (`is_active`),
    CONSTRAINT `fk_news_comments_article`
        FOREIGN KEY (`article_id`) REFERENCES `news_articles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_news_comments_parent`
        FOREIGN KEY (`parent_id`) REFERENCES `news_comments` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

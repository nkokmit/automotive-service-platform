-- Permissions used by news-service API authorization.

INSERT INTO permissions (id, name, display_name, description)
SELECT seed.id, seed.name, seed.display_name, seed.display_name
FROM (
    SELECT '30000000-0000-0000-0000-000000000091' AS id,
           'NEWS_CATEGORY_READ' AS name, 'Read news categories' AS display_name
    UNION ALL SELECT '30000000-0000-0000-0000-000000000092',
           'NEWS_CATEGORY_WRITE', 'Manage news categories'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000093',
           'NEWS_ARTICLE_READ', 'Read news articles'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000094',
           'NEWS_ARTICLE_WRITE', 'Manage news articles'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000095',
           'NEWS_COMMENT_READ', 'Read news comments'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000096',
           'NEWS_COMMENT_CREATE', 'Comment on news articles'
    UNION ALL SELECT '30000000-0000-0000-0000-000000000097',
           'NEWS_COMMENT_MODERATE', 'Moderate news comments'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM permissions existing WHERE existing.name = seed.name);

-- Quản lý (ADMIN, MANAGER) được đăng bài, quản lý danh mục và kiểm duyệt bình luận.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'NEWS_CATEGORY_READ',
    'NEWS_CATEGORY_WRITE',
    'NEWS_ARTICLE_READ',
    'NEWS_ARTICLE_WRITE',
    'NEWS_COMMENT_READ',
    'NEWS_COMMENT_CREATE',
    'NEWS_COMMENT_MODERATE'
)
WHERE r.name IN ('ADMIN', 'MANAGER')
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

-- Khách hàng được đọc tin tức và bình luận bài viết.
-- Không có NEWS_*_WRITE / NEWS_COMMENT_MODERATE — chỉ ADMIN/MANAGER đăng bài.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'NEWS_CATEGORY_READ',
    'NEWS_ARTICLE_READ',
    'NEWS_COMMENT_READ',
    'NEWS_COMMENT_CREATE'
)
WHERE r.name = 'CUSTOMER'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions existing
      WHERE existing.role_id = r.id AND existing.permission_id = p.id
  );

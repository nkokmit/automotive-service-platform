package com.example.news_service.enums;

/**
 * Trạng thái bài viết.
 *
 * <p>Lưu dạng VARCHAR trong DB (không dùng native ENUM của MySQL) — xem
 * {@code V1__init_news_schema.sql}.
 */
public enum NewsArticleStatus {
    /** Bản nháp — chỉ quản lý thấy. */
    DRAFT,
    /** Đã đăng — hiển thị công khai. */
    PUBLISHED,
    /** Đã lưu trữ — không hiển thị công khai nhưng vẫn giữ dữ liệu. */
    ARCHIVED
}

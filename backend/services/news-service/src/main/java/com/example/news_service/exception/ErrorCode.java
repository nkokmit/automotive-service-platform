package com.example.news_service.exception;

/**
 * Mã lỗi thống nhất cho news-service.
 *
 * <p>Quy ước:
 * <ul>
 *   <li>9999 / 1000 - lỗi chung, giữ nguyên số để client xử lý thống nhất</li>
 *   <li>14xx - authentication/authorization, cố ý trùng với các service khác
 *       (1401 / 1403)</li>
 *   <li>60xx - NewsCategory · 61xx - NewsArticle · 62xx - NewsComment</li>
 * </ul>
 */
public enum ErrorCode {

    // Chung
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định"),
    INVALID_REQUEST(1000, "Yêu cầu không hợp lệ"),

    // NewsCategory (60xx)
    NEWS_CATEGORY_NOT_FOUND(6001, "Không tìm thấy danh mục bài viết"),
    NEWS_CATEGORY_ALREADY_EXISTS(6002, "Mã danh mục bài viết đã tồn tại"),
    NEWS_CATEGORY_IN_USE(6003, "Danh mục bài viết đang có bài viết nên không thể xóa"),

    // NewsArticle (61xx)
    NEWS_ARTICLE_NOT_FOUND(6101, "Không tìm thấy bài viết"),
    NEWS_ARTICLE_ALREADY_EXISTS(6102, "Đường dẫn (slug) của bài viết đã tồn tại"),
    NEWS_ARTICLE_INVALID_STATUS(6103, "Trạng thái bài viết không cho phép thao tác này"),
    NEWS_ARTICLE_SLUG_INVALID(6104, "Đường dẫn (slug) không hợp lệ"),

    // NewsComment (62xx)
    NEWS_COMMENT_NOT_FOUND(6201, "Không tìm thấy bình luận"),
    NEWS_COMMENT_FORBIDDEN(6202, "Bạn không có quyền thao tác trên bình luận này"),

    // NewsImage (63xx)
    NEWS_IMAGE_NOT_FOUND(6301, "Không tìm thấy ảnh"),
    NEWS_IMAGE_UPLOAD_FAILED(6302, "Không tải lên được ảnh"),

    // Authentication & Authorization (14xx)
    UNAUTHENTICATED(1401, "Chưa đăng nhập hoặc token không hợp lệ"),
    UNAUTHORIZED(1403, "Bạn không có quyền");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}

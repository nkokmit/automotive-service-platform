package com.example.news_service.dto.request;

import com.example.news_service.enums.NewsArticleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Payload tạo/sửa bài viết — khớp {@code NewsArticleRequest.java}.
 */
public record NewsArticleRequest(
        @NotNull(message = "Danh mục bài viết không được để trống")
        UUID categoryId,

        @NotBlank(message = "Tiêu đề bài viết không được để trống")
        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
        String title,

        /**
         * Đường dẫn (slug) — tuỳ chọn. Bỏ trống thì backend tự sinh từ tiêu đề.
         */
        @Size(max = 200, message = "Đường dẫn tối đa 200 ký tự")
        String slug,

        @Size(max = 5000, message = "Tóm tắt tối đa 5000 ký tự")
        String summary,

        String content,

        @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự")
        String thumbnailUrl,

        @Size(max = 100, message = "Tên tác giả tối đa 100 ký tự")
        String authorName,

        /**
         * Trạng thái bài viết — tuỳ chọn, mặc định {@code DRAFT}.
         */
        NewsArticleStatus status,

        Boolean featured
) {
}

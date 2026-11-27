package com.example.news_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Payload tạo bình luận — khớp {@code NewsCommentRequest.java}.
 */
public record NewsCommentRequest(
        @NotBlank(message = "Nội dung bình luận không được để trống")
        @Size(max = 2000, message = "Nội dung bình luận tối đa 2000 ký tự")
        String content,

        /**
         * Bình luận cha (trả lời) — tuỳ chọn.
         */
        UUID parentId
) {
}

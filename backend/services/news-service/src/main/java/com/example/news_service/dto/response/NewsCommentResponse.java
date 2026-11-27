package com.example.news_service.dto.response;

import java.time.Instant;
import java.util.UUID;

/** Khớp {@code NewsCommentResponse.java}. */
public record NewsCommentResponse(
        UUID id,
        UUID articleId,
        String articleTitle,
        String userId,
        String userName,
        String content,
        UUID parentId,
        Boolean isActive,
        /** Tổng số lượt thích của bình luận. */
        Integer likeCount,
        /** Người đang đăng nhập đã thích bình luận này chưa. */
        Boolean likedByMe,
        Instant createdAt,
        Instant updatedAt
) {
}

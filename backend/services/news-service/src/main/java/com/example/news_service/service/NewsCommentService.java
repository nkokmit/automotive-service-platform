package com.example.news_service.service;

import com.example.news_service.dto.request.NewsCommentRequest;
import com.example.news_service.dto.response.NewsCommentResponse;
import com.example.news_service.enums.NewsCommentSort;

import java.util.List;
import java.util.UUID;

public interface NewsCommentService {

    /**
     * Bình luận đang hiển thị của một bài viết — công khai.
     *
     * @param sort cách sắp xếp (null = cũ nhất trước)
     */
    List<NewsCommentResponse> getCommentsByArticle(UUID articleId, NewsCommentSort sort);

    /** Tất cả bình luận (kể cả đã ẩn) của một bài viết — dùng cho admin. */
    List<NewsCommentResponse> getAllCommentsByArticle(UUID articleId, NewsCommentSort sort);

    /** Tạo bình luận — cần đăng nhập. */
    NewsCommentResponse createComment(UUID articleId, NewsCommentRequest request);

    /** Ẩn / hiện lại bình luận — cần quyền kiểm duyệt. */
    NewsCommentResponse setCommentActive(UUID commentId, boolean active);

    /** Xóa bình luận — tác giả hoặc người có quyền kiểm duyệt. */
    void deleteComment(UUID commentId);

    /**
     * Thích / bỏ thích bình luận — cần đăng nhập.
     *
     * <p>Gọi lại (idempotent): thích 2 lần vẫn chỉ có 1 lượt thích.
     *
     * @return trạng thái mới sau khi thao tác
     */
    NewsCommentResponse toggleLike(UUID commentId);
}

package com.example.news_service.service;

import com.example.news_service.dto.request.NewsCommentRequest;
import com.example.news_service.dto.response.NewsCommentResponse;

import java.util.List;
import java.util.UUID;

public interface NewsCommentService {

    /** Bình luận đang hiển thị của một bài viết — công khai. */
    List<NewsCommentResponse> getCommentsByArticle(UUID articleId);

    /** Tất cả bình luận (kể cả đã ẩn) của một bài viết — dùng cho admin. */
    List<NewsCommentResponse> getAllCommentsByArticle(UUID articleId);

    /** Tạo bình luận — cần đăng nhập. */
    NewsCommentResponse createComment(UUID articleId, NewsCommentRequest request);

    /** Ẩn / hiện lại bình luận — cần quyền kiểm duyệt. */
    NewsCommentResponse setCommentActive(UUID commentId, boolean active);

    /** Xóa bình luận — tác giả hoặc người có quyền kiểm duyệt. */
    void deleteComment(UUID commentId);
}

package com.example.news_service.repository;

import com.example.news_service.entity.NewsComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NewsCommentRepository extends JpaRepository<NewsComment, UUID> {

    /**
     * Bình luận đang hiển thị của một bài viết — sắp xếp cũ nhất trước.
     */
    @Query("""
            SELECT c FROM NewsComment c
            WHERE c.article.id = :articleId AND c.isActive = true
            ORDER BY c.createdAt ASC
            """)
    Page<NewsComment> findActiveByArticleId(@Param("articleId") UUID articleId, Pageable pageable);

    /**
     * Bình luận đang hiển thị của một bài viết (dạng list, không phân trang).
     */
    @Query("""
            SELECT c FROM NewsComment c
            WHERE c.article.id = :articleId AND c.isActive = true
            ORDER BY c.createdAt ASC
            """)
    List<NewsComment> findActiveByArticleId(@Param("articleId") UUID articleId);

    /**
     * Tất cả bình luận (kể cả đã ẩn) của một bài viết — dùng cho admin duyệt/ẩn.
     */
    @Query("""
            SELECT c FROM NewsComment c
            WHERE c.article.id = :articleId
            ORDER BY c.createdAt DESC
            """)
    List<NewsComment> findAllByArticleId(@Param("articleId") UUID articleId);

    /**
     * Đếm số bình luận đang hiển thị của một bài viết.
     */
    @Query("""
            SELECT COUNT(c) FROM NewsComment c
            WHERE c.article.id = :articleId AND c.isActive = true
            """)
    long countActiveByArticleId(@Param("articleId") UUID articleId);

    /**
     * Đếm tổng số bình luận đang hiển thị — dùng cho thống kê ở dashboard admin.
     */
    @Query("SELECT COUNT(c) FROM NewsComment c WHERE c.isActive = true")
    long countActive();
}

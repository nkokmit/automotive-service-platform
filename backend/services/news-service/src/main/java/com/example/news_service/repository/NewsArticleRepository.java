package com.example.news_service.repository;

import com.example.news_service.entity.NewsArticle;
import com.example.news_service.enums.NewsArticleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NewsArticleRepository extends JpaRepository<NewsArticle, UUID> {

    Optional<NewsArticle> findBySlug(String slug);

    boolean existsBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCaseAndIdNot(String slug, UUID id);

    /**
     * Tìm bài viết công khai theo slug — chỉ trả về bài đang PUBLISHED.
     *
     * <p>Dùng cho endpoint đọc bài của khách (chưa đăng nhập).
     */
    @Query("""
            SELECT a FROM NewsArticle a
            JOIN FETCH a.category c
            WHERE a.slug = :slug AND a.status = com.example.news_service.enums.NewsArticleStatus.PUBLISHED
            """)
    Optional<NewsArticle> findPublishedBySlug(@Param("slug") String slug);

    /**
     * Tìm bài viết công khai theo id — chỉ trả về bài đang PUBLISHED.
     */
    @Query("""
            SELECT a FROM NewsArticle a
            JOIN FETCH a.category c
            WHERE a.id = :id AND a.status = com.example.news_service.enums.NewsArticleStatus.PUBLISHED
            """)
    Optional<NewsArticle> findPublishedById(@Param("id") UUID id);

    /**
     * Tăng lượt xem bài viết.
     *
     * <p>{@code clearAutomatically = true} để entity đang nạp trong
     * persistence context không giữ giá trị {@code viewCount} cũ, và
     * {@code flushAutomatically = true} để câu UPDATE được gửi ngay.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE NewsArticle a SET a.viewCount = a.viewCount + 1 WHERE a.id = :id")
    void incrementViewCount(@Param("id") UUID id);

    /**
     * Danh sách bài viết cho trang danh sách tin tức (công khai).
     *
     * @param status    trạng thái được phép hiển thị (null = không lọc)
     * @param categoryId danh mục (null = tất cả)
     * @param keyword   từ khoá tìm trong tiêu đề/tóm tắt (null = không lọc)
     * @param featured  chỉ lấy bài nổi bật (null = không lọc)
     */
    @Query("""
            SELECT a FROM NewsArticle a
            JOIN FETCH a.category c
            WHERE (:status IS NULL OR a.status = :status)
              AND (:categoryId IS NULL OR a.category.id = :categoryId)
              AND (:featured IS NULL OR a.isFeatured = :featured)
              AND (:keyword IS NULL OR :keyword = ''
                   OR LOWER(a.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(COALESCE(a.summary, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<NewsArticle> search(@Param("status") NewsArticleStatus status,
                             @Param("categoryId") UUID categoryId,
                             @Param("keyword") String keyword,
                             @Param("featured") Boolean featured,
                             Pageable pageable);

    /**
     * Bài viết nổi bật đang publish — dùng cho hero/banner ở trang danh sách.
     */
    @Query("""
            SELECT a FROM NewsArticle a
            JOIN FETCH a.category c
            WHERE a.status = com.example.news_service.enums.NewsArticleStatus.PUBLISHED
              AND a.isFeatured = true
            ORDER BY a.publishedAt DESC
            """)
    Page<NewsArticle> findFeaturedPublished(Pageable pageable);

    /**
     * Bài viết cùng danh mục (trừ bài hiện tại) — dùng cho "bài liên quan".
     */
    @Query("""
            SELECT a FROM NewsArticle a
            JOIN FETCH a.category c
            WHERE a.category.id = :categoryId
              AND a.id <> :excludeId
              AND a.status = com.example.news_service.enums.NewsArticleStatus.PUBLISHED
            ORDER BY a.publishedAt DESC
            """)
    Page<NewsArticle> findRelatedPublished(@Param("categoryId") UUID categoryId,
                                           @Param("excludeId") UUID excludeId,
                                           Pageable pageable);

    /**
     * Bài viết mới nhất đã publish — dùng cho mục "Tin mới nhất".
     */
    @Query("""
            SELECT a FROM NewsArticle a
            JOIN FETCH a.category c
            WHERE a.status = com.example.news_service.enums.NewsArticleStatus.PUBLISHED
            ORDER BY a.publishedAt DESC
            """)
    Page<NewsArticle> findLatestPublished(Pageable pageable);

    /**
     * Đếm số bài viết theo trạng thái — dùng cho thống kê ở dashboard admin.
     */
    @Query("SELECT COUNT(a) FROM NewsArticle a WHERE a.status = :status")
    long countByStatus(@Param("status") NewsArticleStatus status);

    /**
     * Đếm số bài viết đã publish trong khoảng thời gian.
     */
    @Query("""
            SELECT COUNT(a) FROM NewsArticle a
            WHERE a.status = com.example.news_service.enums.NewsArticleStatus.PUBLISHED
              AND a.publishedAt >= :from
              AND a.publishedAt < :to
            """)
    long countPublishedBetween(@Param("from") Instant from, @Param("to") Instant to);
}

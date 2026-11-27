package com.example.news_service.entity;

import com.example.news_service.enums.NewsArticleStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Bài viết tin tức.
 *
 * <p>{@code authorId} là UUID của user-service nên chỉ lưu dạng UUID, không
 * tạo JPA relationship (GLOBAL_RULES §2).
 */
@Entity
@Table(name = "news_articles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsArticle {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private NewsCategory category;

    @Column(name = "slug", length = 200, nullable = false, unique = true)
    private String slug;

    @Column(name = "title", length = 255, nullable = false)
    private String title;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "content", columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "author_name", length = 100)
    private String authorName;

    @Column(name = "author_id", length = 36)
    private String authorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    @Builder.Default
    private NewsArticleStatus status = NewsArticleStatus.DRAFT;

    @Column(name = "is_featured", nullable = false)
    @Builder.Default
    private Boolean isFeatured = Boolean.FALSE;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private Integer viewCount = 0;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) status = NewsArticleStatus.DRAFT;
        if (isFeatured == null) isFeatured = Boolean.FALSE;
        if (viewCount == null) viewCount = 0;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}

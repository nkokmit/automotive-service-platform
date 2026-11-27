package com.example.news_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Bình luận của người dùng dưới một bài viết.
 *
 * <p>{@code userId} là UUID của user-service (chỉ lưu UUID, không FK).
 * {@code parentId} trỏ tới bình luận cha trong cùng bài viết (trả lời).
 */
@Entity
@Table(name = "news_comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsComment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "article_id", nullable = false)
    private NewsArticle article;

    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(name = "user_name", length = 100)
    private String userName;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    /**
     * Bình luận cha (trả lời).
     *
     * <p>UUID lưu dạng VARCHAR(36) — dùng {@code @JdbcTypeCode(SqlTypes.VARCHAR)}
     * để khớp với DDL {@code parent_id VARCHAR(36)} và quy ước ID của
     * project (GLOBAL_RULES §2). Thiếu chú thích này, Hibernate sẽ kỳ vọng
     * kiểu {@code binary(36)} và validate schema fail.
     */
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "parent_id", length = 36)
    private UUID parentId;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = Boolean.TRUE;

    /**
     * Số lượt thích — cột denormalized để sắp xếp bình luận theo "nhiều
     * người thích nhất" mà không phải JOIN bảng {@code news_comment_likes}.
     */
    @Column(name = "like_count", nullable = false)
    @Builder.Default
    private Integer likeCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (isActive == null) isActive = Boolean.TRUE;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}

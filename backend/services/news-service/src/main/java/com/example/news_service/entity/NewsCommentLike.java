package com.example.news_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Lượt thích của một người dùng cho một bình luận bài viết.
 *
 * <p>{@code userId} là UUID của user-service — chỉ lưu UUID, không tạo FK
 * (GLOBAL_RULES §2). Ràng buộc UNIQUE {@code (comment_id, user_id)} ở DB
 * đảm bảo mỗi người chỉ thích một bình luận duy nhất.
 */
@Entity
@Table(name = "news_comment_likes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsCommentLike {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comment_id", nullable = false)
    private NewsComment comment;

    /**
     * UUID người thích — thuộc user-service nên chỉ lưu dạng chuỗi.
     */
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "user_id", length = 36, nullable = false)
    private String userId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}

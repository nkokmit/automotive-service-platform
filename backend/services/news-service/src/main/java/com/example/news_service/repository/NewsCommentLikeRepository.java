package com.example.news_service.repository;

import com.example.news_service.entity.NewsCommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NewsCommentLikeRepository extends JpaRepository<NewsCommentLike, UUID> {

    /**
     * Tìm lượt thích theo cặp (bình luận, người thích).
     *
     * <p>Khoá UNIQUE {@code (comment_id, user_id)} ở DB đảm bảo mỗi người
     * chỉ có tối đa một lượt thích cho mỗi bình luận.
     */
    java.util.Optional<NewsCommentLike> findByCommentIdAndUserId(UUID commentId, String userId);

    /**
     * Danh sách bình luận mà người hiện tại đã thích.
     *
     * <p>Dùng để trả về trạng thái "đã thích" kèm mỗi bình luận, để client
     * tô đậm nút thích mà không phải gọi N request.
     */
    @Query("""
            SELECT l.comment.id FROM NewsCommentLike l
            WHERE l.userId = :userId
              AND l.comment.id IN :commentIds
            """)
    List<UUID> findCommentIdsLikedBy(@Param("userId") String userId,
                                     @Param("commentIds") List<UUID> commentIds);

    /**
     * Xoá lượt thích theo cặp (bình luận, người thích).
     */
    long deleteByCommentIdAndUserId(UUID commentId, String userId);
}

package com.example.news_service.mapper;

import com.example.news_service.dto.response.NewsCommentResponse;
import com.example.news_service.entity.NewsComment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Mapper bình luận → response.
 *
 * <p>Giống {@link NewsArticleMapper}: {@code comment.article} là quan hệ
 * {@code @ManyToOne} nên phải map tay sang {@code articleId} /
 * {@code articleTitle}. Bản ghi bình luận không có bài viết thì trả
 * {@code null}.
 *
 * <p>{@code likedByMe} không suy ra được từ entity nên được đặt sau khi map
 * (xem {@code NewsCommentServiceImpl}).
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface NewsCommentMapper {

    @Mapping(target = "articleId", expression = "java(mapArticleId(comment))")
    @Mapping(target = "articleTitle", expression = "java(mapArticleTitle(comment))")
    NewsCommentResponse toResponse(NewsComment comment);

    /** ID bài viết chứa bình luận. */
    default java.util.UUID mapArticleId(NewsComment comment) {
        if (comment == null || comment.getArticle() == null) {
            return null;
        }
        return comment.getArticle().getId();
    }

    /** Tiêu đề bài viết chứa bình luận. */
    default String mapArticleTitle(NewsComment comment) {
        if (comment == null || comment.getArticle() == null) {
            return null;
        }
        return comment.getArticle().getTitle();
    }
}

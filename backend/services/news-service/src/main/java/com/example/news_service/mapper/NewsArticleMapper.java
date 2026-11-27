package com.example.news_service.mapper;

import com.example.news_service.dto.response.NewsArticleResponse;
import com.example.news_service.entity.NewsArticle;
import com.example.news_service.entity.NewsCategory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Mapper bài viết → response.
 *
 * <p>MapStruct KHÔNG tự map {@code NewsArticle.category} (quan hệ
 * {@code @ManyToOne}) sang 3 trường phẳng {@code categoryId} /
 * {@code categoryName} / {@code categoryCode}. Nếu để mặc định, response trả
 * {@code null} cho cả 3 trường và UI không hiển thị được danh mục bài viết —
 * nên phần map danh mục được viết tay ở đây (cùng pattern
 * {@code EntityMapper} của user-service).
 *
 * <p>Danh mục được nạp lười (LAZY) nên phải lấy trong giao dịch; các service
 * đều bọc {@code @Transactional(readOnly = true)} nên không bị
 * {@code LazyInitializationException}.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface NewsArticleMapper {

    @Mapping(target = "categoryId", expression = "java(mapCategoryId(article))")
    @Mapping(target = "categoryName", expression = "java(mapCategoryName(article))")
    @Mapping(target = "categoryCode", expression = "java(mapCategoryCode(article))")
    NewsArticleResponse toResponse(NewsArticle article);

    /** ID danh mục — {@code null} nếu bài viết chưa gắn danh mục. */
    default java.util.UUID mapCategoryId(NewsArticle article) {
        NewsCategory category = categoryOf(article);
        return category == null ? null : category.getId();
    }

    /** Mã danh mục — VD: {@code NEWS}, {@code MAINTENANCE}. */
    default String mapCategoryCode(NewsArticle article) {
        NewsCategory category = categoryOf(article);
        return category == null ? null : category.getCode();
    }

    /** Tên danh mục hiển thị — VD: {@code Tin ô tô}. */
    default String mapCategoryName(NewsArticle article) {
        NewsCategory category = categoryOf(article);
        return category == null ? null : category.getName();
    }

    /** Helper: lấy danh mục hoặc {@code null}. */
    default NewsCategory categoryOf(NewsArticle article) {
        return article == null ? null : article.getCategory();
    }
}

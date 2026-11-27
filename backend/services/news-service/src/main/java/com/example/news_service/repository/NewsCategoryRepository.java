package com.example.news_service.repository;

import com.example.news_service.entity.NewsCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NewsCategoryRepository extends JpaRepository<NewsCategory, UUID> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    @Query("""
            SELECT c FROM NewsCategory c
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(c.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<NewsCategory> search(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Đếm số bài viết thuộc danh mục — dùng để chặn xóa danh mục khi còn bài viết.
     *
     * <p>Đếm TẤT CẢ bài viết (kể cả DRAFT/ARCHIVED) vì FK
     * {@code fk_news_articles_category} là ON DELETE RESTRICT — xóa danh mục có
     * bất kỳ bài viết nào sẽ bị MySQL chặn và API trả 500 nếu không chặn sớm.
     */
    @Query("SELECT COUNT(a) FROM NewsArticle a WHERE a.category.id = :categoryId")
    long countArticlesByCategoryId(@Param("categoryId") UUID categoryId);
}

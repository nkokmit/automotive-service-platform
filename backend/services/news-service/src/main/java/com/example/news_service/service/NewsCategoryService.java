package com.example.news_service.service;

import com.example.news_service.common.PageResponse;
import com.example.news_service.dto.request.NewsCategoryRequest;
import com.example.news_service.dto.response.NewsCategoryResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface NewsCategoryService {

    PageResponse<NewsCategoryResponse> getCategories(String keyword, Pageable pageable);

    /** Danh sách danh mục dạng list (không phân trang) — dùng cho dropdown. */
    List<NewsCategoryResponse> getAllCategories();

    NewsCategoryResponse getCategoryById(UUID id);

    NewsCategoryResponse createCategory(NewsCategoryRequest request);

    NewsCategoryResponse updateCategory(UUID id, NewsCategoryRequest request);

    void deleteCategory(UUID id);
}

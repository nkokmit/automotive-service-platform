package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.dto.request.CategoryRequest;
import com.example.inventory_service.dto.response.CategoryResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ServiceCategoryService {

    PageResponse<CategoryResponse> getCategories(String keyword, Pageable pageable);

    CategoryResponse getCategoryById(UUID id);

    CategoryResponse createCategory(CategoryRequest request);

    CategoryResponse updateCategory(UUID id, CategoryRequest request);

    void deleteCategory(UUID id);
}

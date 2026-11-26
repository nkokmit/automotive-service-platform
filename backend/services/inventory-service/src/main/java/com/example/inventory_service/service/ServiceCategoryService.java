package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.dto.request.CategoryRequest;
import com.example.inventory_service.dto.response.CategoryResponse;
import com.example.inventory_service.dto.response.ServiceResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ServiceCategoryService {

    PageResponse<CategoryResponse> getCategories(String keyword, Pageable pageable);

    CategoryResponse getCategoryById(UUID id);

    CategoryResponse createCategory(CategoryRequest request);

    CategoryResponse updateCategory(UUID id, CategoryRequest request);

    void deleteCategory(UUID id);

    /**
     * Danh sách dịch vụ thuộc nhóm (dịch vụ đang hoạt động trước, sau đó dịch vụ
     * đã ẩn) — dùng cho admin xem nhanh nhóm đang chứa dịch vụ nào.
     */
    List<ServiceResponse> getServicesByCategory(UUID id);
}

package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.PageableFactory;
import com.example.inventory_service.dto.request.CategoryRequest;
import com.example.inventory_service.dto.response.CategoryResponse;
import com.example.inventory_service.service.PartCategoryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/part-categories")
@RequiredArgsConstructor
@Validated
public class PartCategoryController {

    private static final Set<String> SORT_FIELDS = Set.of("code", "name", "createdAt");

    private final PartCategoryService partCategoryService;

    @GetMapping
    @PreAuthorize("hasAuthority('PART_READ')")
    public ApiResponse<PageResponse<CategoryResponse>> getCategories(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        return ApiResponse.success(partCategoryService.getCategories(keyword,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "createdAt")));
    }

    @GetMapping("/{categoryId}")
    @PreAuthorize("hasAuthority('PART_READ')")
    public ApiResponse<CategoryResponse> getCategory(@PathVariable UUID categoryId) {
        return ApiResponse.success(partCategoryService.getCategoryById(categoryId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PART_WRITE')")
    public ApiResponse<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request) {
        return ApiResponse.success("Tạo nhóm phụ tùng thành công", partCategoryService.createCategory(request));
    }

    @PutMapping("/{categoryId}")
    @PreAuthorize("hasAuthority('PART_WRITE')")
    public ApiResponse<CategoryResponse> updateCategory(@PathVariable UUID categoryId,
                                                        @Valid @RequestBody CategoryRequest request) {
        return ApiResponse.success("Cập nhật nhóm phụ tùng thành công",
                partCategoryService.updateCategory(categoryId, request));
    }

    @DeleteMapping("/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('PART_WRITE')")
    public void deleteCategory(@PathVariable UUID categoryId) {
        partCategoryService.deleteCategory(categoryId);
    }
}

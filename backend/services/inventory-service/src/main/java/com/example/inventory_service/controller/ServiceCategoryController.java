package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.PageableFactory;
import com.example.inventory_service.dto.request.CategoryRequest;
import com.example.inventory_service.dto.response.CategoryResponse;
import com.example.inventory_service.service.ServiceCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/api/service-categories")
@RequiredArgsConstructor
@Validated
@Tag(name = "Nhóm dịch vụ", description = "Phân loại dịch vụ trong catalog")
public class ServiceCategoryController {

    private static final Set<String> SORT_FIELDS = Set.of("code", "name", "createdAt");

    private final ServiceCategoryService serviceCategoryService;

    @GetMapping
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    @Operation(summary = "Danh sách nhóm dịch vụ",
            description = "Phân trang và lọc theo keyword trong mã hoặc tên nhóm.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về một trang kết quả nhóm dịch vụ.")
    public ApiResponse<PageResponse<CategoryResponse>> getCategories(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        return ApiResponse.success(serviceCategoryService.getCategories(keyword,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "createdAt")));
    }

    @GetMapping("/{categoryId}")
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    @Operation(summary = "Chi tiết nhóm dịch vụ")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về chi tiết nhóm dịch vụ.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy nhóm dịch vụ.")
    public ApiResponse<CategoryResponse> getCategory(@PathVariable UUID categoryId) {
        return ApiResponse.success(serviceCategoryService.getCategoryById(categoryId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    @Operation(summary = "Tạo nhóm dịch vụ")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
            description = "Nhóm dịch vụ đã được tạo.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Mã nhóm dịch vụ đã tồn tại.")
    public ApiResponse<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request) {
        return ApiResponse.success("Tạo nhóm dịch vụ thành công", serviceCategoryService.createCategory(request));
    }

    @PutMapping("/{categoryId}")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    @Operation(summary = "Cập nhật nhóm dịch vụ")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Nhóm dịch vụ đã được cập nhật.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Mã nhóm dịch vụ đã tồn tại hoặc nhóm không tồn tại.")
    public ApiResponse<CategoryResponse> updateCategory(@PathVariable UUID categoryId,
                                                        @Valid @RequestBody CategoryRequest request) {
        return ApiResponse.success("Cập nhật nhóm dịch vụ thành công",
                serviceCategoryService.updateCategory(categoryId, request));
    }

    @DeleteMapping("/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    @Operation(summary = "Xóa nhóm dịch vụ",
            description = "Không xóa được nếu nhóm đang có dịch vụ.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204",
            description = "Nhóm dịch vụ đã bị xóa.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Nhóm dịch vụ đang được sử dụng.")
    public void deleteCategory(@PathVariable UUID categoryId) {
        serviceCategoryService.deleteCategory(categoryId);
    }
}

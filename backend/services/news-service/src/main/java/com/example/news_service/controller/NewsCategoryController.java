package com.example.news_service.controller;

import com.example.news_service.common.ApiResponse;
import com.example.news_service.common.PageResponse;
import com.example.news_service.common.PageableFactory;
import com.example.news_service.dto.request.NewsCategoryRequest;
import com.example.news_service.dto.response.NewsCategoryResponse;
import com.example.news_service.service.NewsCategoryService;
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

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/news-categories")
@RequiredArgsConstructor
@Validated
@Tag(name = "Danh mục bài viết", description = "Quản lý danh mục của bài viết tin tức")
public class NewsCategoryController {

    private static final Set<String> SORT_FIELDS = Set.of("code", "name", "createdAt");

    private final NewsCategoryService newsCategoryService;

    @GetMapping
    @PreAuthorize("permitAll()")
    @Operation(summary = "Danh sách danh mục bài viết",
            description = "Phân trang và lọc theo keyword trong mã hoặc tên danh mục.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về một trang kết quả danh mục bài viết.")
    public ApiResponse<PageResponse<NewsCategoryResponse>> getCategories(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection
    ) {
        return ApiResponse.success(newsCategoryService.getCategories(keyword,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "name")));
    }

    @GetMapping("/all")
    @PreAuthorize("permitAll()")
    @Operation(summary = "Danh sách danh mục bài viết (dạng list)",
            description = "Trả về toàn bộ danh mục dạng list — dùng cho dropdown bộ lọc.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về toàn bộ danh mục bài viết.")
    public ApiResponse<List<NewsCategoryResponse>> getAllCategories() {
        return ApiResponse.success(newsCategoryService.getAllCategories());
    }

    @GetMapping("/{categoryId}")
    @PreAuthorize("permitAll()")
    @Operation(summary = "Chi tiết danh mục bài viết")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về chi tiết danh mục bài viết.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy danh mục bài viết.")
    public ApiResponse<NewsCategoryResponse> getCategory(@PathVariable UUID categoryId) {
        return ApiResponse.success(newsCategoryService.getCategoryById(categoryId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('NEWS_CATEGORY_WRITE')")
    @Operation(summary = "Tạo danh mục bài viết")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
            description = "Danh mục bài viết đã được tạo.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Mã danh mục bài viết đã tồn tại.")
    public ApiResponse<NewsCategoryResponse> createCategory(@Valid @RequestBody NewsCategoryRequest request) {
        return ApiResponse.success("Tạo danh mục bài viết thành công",
                newsCategoryService.createCategory(request));
    }

    @PutMapping("/{categoryId}")
    @PreAuthorize("hasAuthority('NEWS_CATEGORY_WRITE')")
    @Operation(summary = "Cập nhật danh mục bài viết")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Danh mục bài viết đã được cập nhật.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Mã danh mục đã tồn tại hoặc danh mục không tồn tại.")
    public ApiResponse<NewsCategoryResponse> updateCategory(@PathVariable UUID categoryId,
                                                             @Valid @RequestBody NewsCategoryRequest request) {
        return ApiResponse.success("Cập nhật danh mục bài viết thành công",
                newsCategoryService.updateCategory(categoryId, request));
    }

    @DeleteMapping("/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('NEWS_CATEGORY_WRITE')")
    @Operation(summary = "Xóa danh mục bài viết",
            description = "Không xóa được nếu danh mục đang có bài viết.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204",
            description = "Danh mục bài viết đã bị xóa.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Danh mục bài viết đang được sử dụng.")
    public void deleteCategory(@PathVariable UUID categoryId) {
        newsCategoryService.deleteCategory(categoryId);
    }
}

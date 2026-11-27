package com.example.news_service.controller;

import com.example.news_service.common.ApiResponse;
import com.example.news_service.common.PageResponse;
import com.example.news_service.common.PageableFactory;
import com.example.news_service.dto.request.NewsArticleRequest;
import com.example.news_service.dto.response.NewsArticleResponse;
import com.example.news_service.dto.response.NewsStatsResponse;
import com.example.news_service.enums.NewsArticleStatus;
import com.example.news_service.service.NewsArticleService;
import com.example.news_service.service.NewsStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
@RequestMapping("/api/news-articles")
@RequiredArgsConstructor
@Validated
@Tag(name = "Bài viết tin tức", description = "Đăng bài, quản lý và đọc bài viết tin tức")
public class NewsArticleController {

    private static final Set<String> SORT_FIELDS =
            Set.of("title", "publishedAt", "createdAt", "updatedAt", "viewCount");

    private final NewsArticleService newsArticleService;
    private final NewsStatsService newsStatsService;

    // ── Đọc công khai ────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("permitAll()")
    @Operation(summary = "Danh sách bài viết đã đăng",
            description = "Trang tin tức công khai. Chỉ trả về bài viết đang PUBLISHED.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về một trang kết quả bài viết.")
    public ApiResponse<PageResponse<NewsArticleResponse>> getPublishedArticles(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "publishedAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        return ApiResponse.success(newsArticleService.getPublishedArticles(keyword, categoryId, featured,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "publishedAt")));
    }

    @GetMapping("/featured")
    @PreAuthorize("permitAll()")
    @Operation(summary = "Bài viết nổi bật",
            description = "Các bài viết đang PUBLISHED được đánh dấu nổi bật.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về danh sách bài viết nổi bật.")
    public ApiResponse<PageResponse<NewsArticleResponse>> getFeaturedArticles(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "5") @Min(1) @Max(50) int size
    ) {
        return ApiResponse.success(newsArticleService.getFeaturedArticles(PageRequest.of(page, size)));
    }

    @GetMapping("/{slug}")
    @PreAuthorize("permitAll()")
    @Operation(summary = "Chi tiết bài viết theo slug",
            description = "Đọc bài viết công khai. Mỗi lượt đọc sẽ tăng bộ đếm lượt xem.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về chi tiết bài viết.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy bài viết.")
    public ApiResponse<NewsArticleResponse> getArticleBySlug(@PathVariable String slug) {
        return ApiResponse.success(newsArticleService.getPublishedArticleBySlug(slug));
    }

    @GetMapping("/{articleId}/related")
    @PreAuthorize("permitAll()")
    @Operation(summary = "Bài viết liên quan",
            description = "Các bài viết đang PUBLISHED cùng danh mục với bài hiện tại.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về danh sách bài viết liên quan.")
    public ApiResponse<PageResponse<NewsArticleResponse>> getRelatedArticles(
            @PathVariable UUID articleId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "5") @Min(1) @Max(50) int size
    ) {
        NewsArticleResponse current = newsArticleService.getArticleById(articleId);
        return ApiResponse.success(newsArticleService.getRelatedArticles(
                current.categoryId(), articleId, PageRequest.of(page, size)));
    }

    // ── Quản lý (cần quyền) ──────────────────────────────────────────────────

    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('NEWS_ARTICLE_READ')")
    @Operation(summary = "Danh sách bài viết cho quản lý",
            description = "Hiển thị mọi trạng thái (DRAFT / PUBLISHED / ARCHIVED).")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về một trang kết quả bài viết.")
    public ApiResponse<PageResponse<NewsArticleResponse>> getAllArticles(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) NewsArticleStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        return ApiResponse.success(newsArticleService.getAllArticles(keyword, categoryId, status,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "updatedAt")));
    }

    @GetMapping("/admin/{articleId}")
    @PreAuthorize("hasAuthority('NEWS_ARTICLE_READ')")
    @Operation(summary = "Chi tiết bài viết (quản lý)",
            description = "Xem bài viết ở mọi trạng thái — dùng để sửa bài.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về chi tiết bài viết.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy bài viết.")
    public ApiResponse<NewsArticleResponse> getArticleById(@PathVariable UUID articleId) {
        return ApiResponse.success(newsArticleService.getArticleById(articleId));
    }

    @GetMapping("/admin/stats")
    @PreAuthorize("hasAuthority('NEWS_ARTICLE_READ')")
    @Operation(summary = "Thống kê tin tức",
            description = "Tổng số bài viết theo trạng thái, danh mục và bình luận.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về số liệu tổng quan.")
    public ApiResponse<NewsStatsResponse> getStats() {
        return ApiResponse.success(newsStatsService.getStats());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('NEWS_ARTICLE_WRITE')")
    @Operation(summary = "Tạo bài viết")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
            description = "Bài viết đã được tạo.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Danh mục không tồn tại hoặc dữ liệu không hợp lệ.")
    public ApiResponse<NewsArticleResponse> createArticle(@Valid @RequestBody NewsArticleRequest request) {
        return ApiResponse.success("Tạo bài viết thành công", newsArticleService.createArticle(request));
    }

    @PutMapping("/{articleId}")
    @PreAuthorize("hasAuthority('NEWS_ARTICLE_WRITE')")
    @Operation(summary = "Cập nhật bài viết")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Bài viết đã được cập nhật.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Danh mục không tồn tại, slug trùng hoặc bài viết không tồn tại.")
    public ApiResponse<NewsArticleResponse> updateArticle(@PathVariable UUID articleId,
                                                          @Valid @RequestBody NewsArticleRequest request) {
        return ApiResponse.success("Cập nhật bài viết thành công",
                newsArticleService.updateArticle(articleId, request));
    }

    @PostMapping("/{articleId}/publish")
    @PreAuthorize("hasAuthority('NEWS_ARTICLE_WRITE')")
    @Operation(summary = "Đăng bài viết",
            description = "Chuyển bài viết sang trạng thái PUBLISHED để hiển thị công khai.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Bài viết đã được đăng.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Trạng thái hiện tại không cho phép đăng.")
    public ApiResponse<NewsArticleResponse> publishArticle(@PathVariable UUID articleId) {
        return ApiResponse.success("Đăng bài viết thành công",
                newsArticleService.publishArticle(articleId));
    }

    @PostMapping("/{articleId}/unpublish")
    @PreAuthorize("hasAuthority('NEWS_ARTICLE_WRITE')")
    @Operation(summary = "Chuyển bài viết về bản nháp")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Bài viết đã được chuyển về bản nháp.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Trạng thái hiện tại không cho phép chuyển về bản nháp.")
    public ApiResponse<NewsArticleResponse> unpublishArticle(@PathVariable UUID articleId) {
        return ApiResponse.success("Chuyển bài viết về bản nháp thành công",
                newsArticleService.unpublishArticle(articleId));
    }

    @PostMapping("/{articleId}/archive")
    @PreAuthorize("hasAuthority('NEWS_ARTICLE_WRITE')")
    @Operation(summary = "Lưu trữ bài viết")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Bài viết đã được lưu trữ.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Trạng thái hiện tại không cho phép lưu trữ.")
    public ApiResponse<NewsArticleResponse> archiveArticle(@PathVariable UUID articleId) {
        return ApiResponse.success("Lưu trữ bài viết thành công",
                newsArticleService.archiveArticle(articleId));
    }

    @DeleteMapping("/{articleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('NEWS_ARTICLE_WRITE')")
    @Operation(summary = "Xóa bài viết",
            description = "Xóa bài viết kèm các bình luận của bài đó.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204",
            description = "Bài viết đã bị xóa.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy bài viết.")
    public void deleteArticle(@PathVariable UUID articleId) {
        newsArticleService.deleteArticle(articleId);
    }
}

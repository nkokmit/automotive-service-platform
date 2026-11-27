package com.example.news_service.controller;

import com.example.news_service.common.ApiResponse;
import com.example.news_service.dto.request.NewsCommentRequest;
import com.example.news_service.dto.response.NewsCommentResponse;
import com.example.news_service.service.NewsCommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/news-comments")
@RequiredArgsConstructor
@Validated
@Tag(name = "Bình luận bài viết", description = "Bình luận và kiểm duyệt bình luận")
public class NewsCommentController {

    private final NewsCommentService newsCommentService;

    @GetMapping("/articles/{articleId}")
    @PreAuthorize("permitAll()")
    @Operation(summary = "Bình luận của một bài viết",
            description = "Trả về các bình luận đang hiển thị của bài viết.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về danh sách bình luận.")
    public ApiResponse<List<NewsCommentResponse>> getCommentsByArticle(@PathVariable UUID articleId) {
        return ApiResponse.success(newsCommentService.getCommentsByArticle(articleId));
    }

    @GetMapping("/articles/{articleId}/all")
    @PreAuthorize("hasAuthority('NEWS_COMMENT_MODERATE')")
    @Operation(summary = "Tất cả bình luận của một bài viết (quản lý)",
            description = "Bao gồm cả bình luận đã bị ẩn — dùng cho quản lý.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Trả về danh sách bình luận.")
    public ApiResponse<List<NewsCommentResponse>> getAllCommentsByArticle(@PathVariable UUID articleId) {
        return ApiResponse.success(newsCommentService.getAllCommentsByArticle(articleId));
    }

    @PostMapping("/articles/{articleId}")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('NEWS_COMMENT_CREATE')")
    @Operation(summary = "Gửi bình luận",
            description = "Người dùng đã đăng nhập có thể bình luận bài viết.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
            description = "Bình luận đã được gửi.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Bài viết không tồn tại hoặc nội dung không hợp lệ.")
    public ApiResponse<NewsCommentResponse> createComment(@PathVariable UUID articleId,
                                                         @Valid @RequestBody NewsCommentRequest request) {
        return ApiResponse.success("Gửi bình luận thành công",
                newsCommentService.createComment(articleId, request));
    }

    @PatchMapping("/{commentId}")
    @PreAuthorize("hasAuthority('NEWS_COMMENT_MODERATE')")
    @Operation(summary = "Ẩn / hiện bình luận",
            description = "Chuyển trạng thái hiển thị của bình luận (isActive).")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Bình luận đã được cập nhật.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy bình luận.")
    public ApiResponse<NewsCommentResponse> setCommentActive(@PathVariable UUID commentId,
                                                            @RequestParam(defaultValue = "false") boolean active) {
        return ApiResponse.success(active ? "Đã hiển thị bình luận" : "Đã ẩn bình luận",
                newsCommentService.setCommentActive(commentId, active));
    }

    @DeleteMapping("/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xóa bình luận",
            description = "Tác giả bình luận hoặc người có quyền kiểm duyệt có thể xóa.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204",
            description = "Bình luận đã bị xóa.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy bình luận hoặc không đủ quyền.")
    public void deleteComment(@PathVariable UUID commentId) {
        newsCommentService.deleteComment(commentId);
    }
}

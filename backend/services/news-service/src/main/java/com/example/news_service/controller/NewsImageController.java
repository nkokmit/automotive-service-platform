package com.example.news_service.controller;

import com.example.news_service.common.ApiResponse;
import com.example.news_service.dto.response.NewsImageUploadResponse;
import com.example.news_service.service.NewsImageStorageService;import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.Map;

/**
 * Tải lên & phục vụ ảnh bài viết.
 *
 * <p>Quản trị viên chọn ảnh từ máy → {@code POST /api/news-images/upload}
 * (multipart) → nhận về URL công khai để nhúng vào nội dung bài viết hoặc
 * dùng làm ảnh đại diện. Ảnh được phục vụ lại qua
 * {@code GET /api/news-images/{filename}}.
 *
 * <p>Việc đọc ảnh (GET) là public vì ảnh xuất hiện trong bài viết mà khách
 * chưa đăng nhập vẫn xem được — nếu chặn GET thì ảnh trong bài sẽ vỡ.
 */
@RestController
@RequestMapping("/api/news-images")
@RequiredArgsConstructor
@Tag(name = "Ảnh tin tức", description = "Tải lên và phục vụ ảnh cho bài viết tin tức")
public class NewsImageController {

    private final NewsImageStorageService newsImageStorageService;

    @PostMapping("/upload")
    @PreAuthorize("hasAuthority('NEWS_ARTICLE_WRITE')")
    @Operation(summary = "Tải lên ảnh cho bài viết",
            description = "Nhận ảnh (JPEG/PNG/WEBP/GIF, tối đa 5 MB) và trả về URL công khai "
                    + "để nhúng vào nội dung bài viết hoặc dùng làm ảnh đại diện.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Ảnh đã được tải lên.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "File không hợp lệ (sai định dạng hoặc quá lớn).")
    public ApiResponse<NewsImageUploadResponse> uploadImage(
            @RequestParam("file") MultipartFile file) {
        NewsImageStorageService.StoredImage stored = newsImageStorageService.store(file);
        return ApiResponse.success("Tải lên ảnh thành công", new NewsImageUploadResponse(
                stored.url(),
                stored.filename(),
                stored.contentType(),
                stored.size()));
    }

    @GetMapping("/{filename}")
    @PreAuthorize("permitAll()")
    @Operation(summary = "Phục vụ ảnh bài viết",
            description = "Trả về nội dung ảnh đã tải lên. Công khai vì ảnh hiển thị "
                    + "trong bài viết mà khách chưa đăng nhập vẫn xem được.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
            description = "Nội dung ảnh.")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
            description = "Không tìm thấy ảnh hoặc tên file không hợp lệ.")
    public ResponseEntity<byte[]> getImage(@PathVariable String filename) {
        byte[] content = newsImageStorageService.load(filename);
        return ResponseEntity.ok()
                .contentType(resolveMediaType(filename))
                // Ảnh bài viết là tài nguyên tĩnh theo tên file → cache lâu.
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .body(content);
    }

    /** Suy ra MediaType từ extension — không dùng mảng tĩnh dễ quên cập nhật. */
    private MediaType resolveMediaType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (lower.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        if (lower.endsWith(".gif")) {
            return MediaType.IMAGE_GIF;
        }
        return MediaType.IMAGE_JPEG;
    }

    /**
     * Thông tin ảnh sau khi tải lên.
     *
     * @param url         URL công khai để nhúng vào nội dung bài viết
     * @param filename    tên file trong kho lưu trữ
     * @param contentType MIME type của ảnh
     * @param size        dung lượng (bytes)
     */
    public record NewsImageUploadResponse(
            String url,
            String filename,
            String contentType,
            long size
    ) {
    }
}

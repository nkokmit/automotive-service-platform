package com.example.news_service.dto.response;

/**
 * Thông tin ảnh sau khi tải lên — khớp {@code NewsImageController.uploadImage}.
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

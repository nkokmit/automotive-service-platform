package com.example.news_service.service;

import com.example.news_service.exception.ApiException;
import com.example.news_service.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Lưu trữ ảnh bài viết trên đĩa của news-service.
 *
 * <p>Quyết định thiết kế: lưu file cục bộ (volume Docker) + phục vụ qua
 * chính news-service, KHÔNG đẩy ảnh lên dịch vụ bên thứ ba (Unsplash /
 * imgur...). Lý do:
 * <ul>
 *   <li>Không phụ thuộc API key / tài khoản bên ngoài — chạy được offline.</li>
 *   <li>Ảnh do người quản trị tải lên là tài sản riêng, không nên nằm trên
 *       dịch vụ của bên thứ ba.</li>
 *   <li>Giữ đúng mô hình "service sở hữu dữ liệu của mình" (GLOBAL_RULES §1)
 *       — ảnh là dữ liệu của news-service.</li>
 * </ul>
 *
 * <p>Tên file được sinh lại bằng UUID để tránh trùng và tránh path traversal.
 * File được phục vụ lại qua {@code GET /api/news-images/{filename}}.
 */
@Service
@Slf4j
public class NewsImageStorageService {

    /**
     * Định dạng ảnh được phép — chỉ nhận ảnh thật, chặn SVG (SVG có thể chứa
     * script → XSS khi render bằng {@code <img>}).
     */
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp", "gif");

    private static final long DEFAULT_MAX_SIZE_BYTES = 5L * 1024 * 1024;

    private final Path rootDirectory;
    private final long maxSizeBytes;
    private final String publicBasePath;

    public NewsImageStorageService(
            @Value("${app.image-storage.directory:/app/uploads}") String directory,
            @Value("${app.image-storage.max-size-bytes:5242880}") long maxSizeBytes,
            @Value("${app.image-storage.public-base-path:/api/news-images}") String publicBasePath
    ) {
        this.rootDirectory = Paths.get(directory).toAbsolutePath().normalize();
        this.maxSizeBytes = maxSizeBytes;
        this.publicBasePath = publicBasePath;
        try {
            Files.createDirectories(this.rootDirectory);
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Không tạo được thư mục lưu ảnh: " + this.rootDirectory, exception);
        }
        log.info("Kho lưu ảnh tin tức: {}", this.rootDirectory);
    }

    /**
     * Lưu ảnh tải lên và trả về thông tin file.
     *
     * @param file file ảnh do người dùng chọn từ máy
     */
    public StoredImage store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "File ảnh không được để trống.");
        }
        if (file.getSize() > maxSizeBytes) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Kích thước ảnh tối đa " + (maxSizeBytes / 1024 / 1024) + " MB.");
        }

        String contentType = file.getContentType() == null
                ? ""
                : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Chỉ hỗ trợ ảnh JPEG, PNG, WEBP hoặc GIF.");
        }

        String extension = resolveExtension(file.getOriginalFilename(), contentType);
        String filename = buildFilename(extension);

        try (InputStream input = file.getInputStream()) {
            Path target = rootDirectory.resolve(filename);
            Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            log.info("Đã lưu ảnh tin tức: {} ({} bytes)", filename, file.getSize());
            return new StoredImage(
                    publicBasePath + "/" + filename,
                    filename,
                    contentType,
                    file.getSize());
        } catch (IOException exception) {
            log.error("Không lưu được ảnh tin tức", exception);
            throw new ApiException(ErrorCode.UNCATEGORIZED_EXCEPTION,
                    "Không lưu được ảnh. Vui lòng thử lại.");
        }
    }

    /**
     * Đọc ảnh đã lưu theo tên file.
     *
     * @throws ApiException nếu tên file không hợp lệ hoặc file không tồn tại
     */
    public byte[] load(String filename) {
        Path path = resolveSafePath(filename);
        if (!Files.exists(path) || !Files.isRegularFile(path)) {
            throw new ApiException(ErrorCode.NEWS_IMAGE_NOT_FOUND, "Không tìm thấy ảnh.");
        }
        try {
            return Files.readAllBytes(path);
        } catch (IOException exception) {
            log.error("Không đọc được ảnh tin tức: {}", filename, exception);
            throw new ApiException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Không đọc được ảnh.");
        }
    }

    /**
     * Xoá ảnh đã lưu. Không ném lỗi nếu file không tồn tại (idempotent).
     */
    public void delete(String filename) {
        Path path = resolveSafePath(filename);
        try {
            Files.deleteIfExists(path);
            log.info("Đã xoá ảnh tin tức: {}", filename);
        } catch (IOException exception) {
            log.warn("Không xoá được ảnh tin tức: {}", filename, exception);
        }
    }

    /**
     * Chống path traversal: tên file phải là tên đơn giản, không có dấu `/`,
     * `\` hay `..`, và kết quả resolve phải nằm trong thư mục gốc.
     */
    private Path resolveSafePath(String filename) {
        if (filename == null || filename.isBlank()
                || filename.contains("/") || filename.contains("\\")
                || filename.contains("..")) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Tên file ảnh không hợp lệ.");
        }
        Path path = rootDirectory.resolve(filename).normalize();
        if (!path.startsWith(rootDirectory)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Tên file ảnh không hợp lệ.");
        }
        return path;
    }

    /** Suy ra extension từ tên file gốc, fallback theo content type. */
    private String resolveExtension(String originalFilename, String contentType) {
        if (originalFilename != null && originalFilename.contains(".")) {
            String extension = originalFilename.substring(originalFilename.lastIndexOf('.') + 1)
                    .toLowerCase(Locale.ROOT);
            if (ALLOWED_EXTENSIONS.contains(extension)) {
                return extension;
            }
        }
        return switch (contentType) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/gif" -> "gif";
            default -> "jpg";
        };
    }

    /**
     * Sinh tên file duy nhất: {@code yyyyMMdd-HHmmss-uuid.ext} — giúp người
     * quản trị dễ nhận biết trong volume, còn UUID đảm bảo không trùng.
     */
    private String buildFilename(String extension) {
        String timestamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")
                .withZone(ZoneId.of("Asia/Ho_Chi_Minh"))
                .format(Instant.now());
        return timestamp + "-" + UUID.randomUUID() + "." + extension;
    }

    /**
     * Thông tin ảnh sau khi lưu.
     *
     * @param url        URL công khai để nhúng vào nội dung bài viết
     * @param filename   tên file trong kho
     * @param contentType MIME type
     * @param size       dung lượng (bytes)
     */
    public record StoredImage(String url, String filename, String contentType, long size) {
    }
}

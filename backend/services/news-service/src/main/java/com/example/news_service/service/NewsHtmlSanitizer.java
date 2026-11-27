package com.example.news_service.service;

import com.example.news_service.exception.ApiException;
import com.example.news_service.exception.ErrorCode;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Lọc (sanitize) HTML nội dung bài viết trước khi lưu.
 *
 * <p>VÌ SAO CẦN: nội dung bài viết do quản trị soạn bằng trình soạn thảo
 * rich-text và được frontend render bằng {@code dangerouslySetInnerHTML}.
 * Nếu lưu nguyên HTML không lọc, một tài khoản có quyền
 * {@code NEWS_ARTICLE_WRITE} có thể chèn {@code <script>} / {@code onerror=}
 * để tấn công mọi người đọc bài — đây là lỗ hổng XSS lưu trữ (stored XSS).
 *
 * <p>Cơ chế: Jsoup {@link Safelist} cho phép đúng danh sách thẻ/attribute
 * an toàn tương ứng với những gì trình soạn thảo sinh ra. Mọi thứ ngoài
 * danh sách bị loại bỏ (không phải escape) để nội dung hiển thị sạch.
 *
 * <p>LƯU Ý: đây là lớp phòng thủ phía server. Frontend cũng nên escape khi
 * hiển thị — nhưng theo nguyên tắc "defence in depth", không được tin hoàn
 * toàn vào client.
 */
@Service
public class NewsHtmlSanitizer {

    /**
     * Thẻ được phép — bám sát những gì trình soạn thảo rich-text sinh ra
     * (tiêu đề, đoạn văn, danh sách, trích dẫn, ảnh, liên kết, bảng).
     */
    private static final Safelist SAFELIST = Safelist.relaxed()
            // Thẻ cấu trúc nội dung.
            .addTags("h1", "h2", "h3", "h4", "h5", "h6",
                    "p", "br", "hr",
                    "ul", "ol", "li",
                    "blockquote", "pre", "code",
                    "strong", "em", "u", "s", "sub", "sup",
                    "span", "div",
                    "figure", "figcaption",
                    "img", "a",
                    "table", "thead", "tbody", "tfoot", "tr", "th", "td")
            // Attribute an toàn trên thẻ đã cho phép.
            .addAttributes("a", "href", "title", "target", "rel")
            .addAttributes("img", "src", "alt", "title", "width", "height")
            .addAttributes("span", "style")
            .addAttributes("p", "style")
            .addAttributes("div", "style")
            .addAttributes("h2", "style")
            .addAttributes("h3", "style")
            // Chỉ cho phép style an toàn (màu, cỡ chữ, canh lề) — chặn
            // `position:fixed`, `expression(...)` và các kiểu nguy hiểm khác.
            .addAttributes(":all", "style")
            .addProtocols("a", "href", "http", "https", "mailto", "tel")
            .addProtocols("img", "src", "http", "https")
            // Giữ bảng, trích dẫn, pre/code — cần cho bài viết kỹ thuật.
            //
            // LƯU Ý: bật `preserveRelativeLinks` để giữ đường dẫn ảnh nội bộ
            // dạng `/api/news-images/...` (ảnh do người dùng tải lên kho của
            // news-service). Sau đó ta tự kiểm tra lại từng `src`/`href` bằng
            // `isSafeImageSource` / `isSafeLink` để chặn scheme nguy hiểm —
            // không phụ thuộc mặc định của Jsoup.
            .preserveRelativeLinks(true);

    /**
     * Style bị chặn — dùng để lọc thủ công các thuộc tính style nguy hiểm
     * mà {@link Safelist} chưa chặn (vd: {@code position:fixed} để che UI,
     * {@code z-index} khổng lồ để chồng lấp).
     */
    private static final Pattern DANGEROUS_STYLE = Pattern.compile(
            "position\\s*:\\s*(fixed|absolute|sticky)"
                    + "|z-index\\s*:\\s*\\d{4,}"
                    + "|expression\\s*\\("
                    + "|url\\s*\\(\\s*['\"]?\\s*javascript:",
            Pattern.CASE_INSENSITIVE);

    /**
     * Lọc HTML và trả về nội dung an toàn để lưu.
     *
     * @param html HTML thô do trình soạn thảo sinh ra
     * @return HTML đã lọc, hoặc {@code null} nếu đầu vào rỗng
     */
    public String sanitize(String html) {
        if (html == null || html.isBlank()) {
            return null;
        }

        // `Jsoup.clean` trả về String đã lọc — parse lại thành Document để
        // dọn thuộc tính `style` nguy hiểm mà Safelist chưa chặn.
        Document cleaned = Jsoup.parseBodyFragment(Jsoup.clean(html, SAFELIST));
        cleanDangerousStyles(cleaned);
        cleanUnsafeSources(cleaned);

        String result = cleaned.body().html().trim();
        return result.isEmpty() ? null : result;
    }

    /**
     * Loại bỏ các thuộc tính {@code style} chứa CSS nguy hiểm.
     *
     * <p>Jsoup đã chặn {@code <script>}, {@code onerror=}, {@code javascript:}
     * — nhưng {@code style} vẫn có thể dùng để che UI hoặc chồng lấp nội
     * dung. Ở đây chỉ giữ lại style sạch, bỏ style có mẫu nguy hiểm.
     */
    private void cleanDangerousStyles(Document document) {
        for (Element element : document.getAllElements()) {
            if (!element.hasAttr("style")) {
                continue;
            }
            String style = element.attr("style");
            if (DANGEROUS_STYLE.matcher(style).find()) {
                element.removeAttr("style");
            }
        }
    }

    /**
     * Kiểm tra lại {@code src} của ảnh và {@code href} của liên kết.
     *
     * <p>Vì {@code preserveRelativeLinks(true)} giữ lại đường dẫn tương đối,
     * ta phải tự kiểm tra scheme để chắc chắn không có {@code javascript:}
     * hay {@code data:} lọt vào. Đường dẫn bắt đầu bằng {@code /} (ảnh nội
     * bộ) và {@code http(s)} được phép; còn lại bị loại bỏ.
     */
    private void cleanUnsafeSources(Document document) {
        for (Element image : document.select("img[src]")) {
            if (!isSafeImageSource(image.attr("src"))) {
                image.remove();
            }
        }
        for (Element link : document.select("a[href]")) {
            if (!isSafeLink(link.attr("href"))) {
                link.removeAttr("href");
            }
        }
    }

    /**
     * Nguồn ảnh an toàn: URL http(s) hoặc đường dẫn nội bộ bắt đầu bằng
     * {@code /}. Chặn {@code javascript:}, {@code data:}, {@code file:}…
     */
    private boolean isSafeImageSource(String source) {
        if (source == null || source.isBlank()) {
            return false;
        }
        String lower = source.trim().toLowerCase(Locale.ROOT);
        if (lower.startsWith("/")) {
            return true;
        }
        return lower.startsWith("http://") || lower.startsWith("https://");
    }

    /**
     * Liên kết an toàn: URL http(s), mailto, tel hoặc đường dẫn nội bộ.
     */
    private boolean isSafeLink(String href) {
        if (href == null || href.isBlank()) {
            return false;
        }
        String lower = href.trim().toLowerCase(Locale.ROOT);
        if (lower.startsWith("/")) {
            return true;
        }
        return lower.startsWith("http://")
                || lower.startsWith("https://")
                || lower.startsWith("mailto:")
                || lower.startsWith("tel:");
    }

    /**
     * Kiểm tra ảnh có trỏ tới kho ảnh nội bộ hay không.
     *
     * <p>Dùng để nhận diện ảnh do quản trị tải lên (URL bắt đầu bằng
     * {@code /api/news-images/}) — phục vụ cho việc dọn ảnh mồ côi khi xoá bài.
     *
     * @param url đường dẫn ảnh trong nội dung bài viết
     */
    public boolean isInternalImageUrl(String url) {
        return url != null && url.startsWith("/api/news-images/");
    }

    /**
     * Trích ra danh sách URL ảnh nội bộ có trong nội dung bài viết.
     *
     * @param html nội dung bài viết
     * @return tập các đường dẫn ảnh thuộc kho nội bộ
     */
    public Set<String> extractInternalImageUrls(String html) {
        if (html == null || html.isBlank()) {
            return Set.of();
        }
        Document document = Jsoup.parseBodyFragment(html);
        return document.select("img[src]")
                .stream()
                .map(element -> element.attr("src"))
                .filter(this::isInternalImageUrl)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }
}

package com.example.news_service.service;

import com.example.news_service.common.PageResponse;
import com.example.news_service.common.TextUtils;
import com.example.news_service.dto.request.NewsArticleRequest;
import com.example.news_service.dto.response.NewsArticleResponse;
import com.example.news_service.entity.NewsArticle;
import com.example.news_service.entity.NewsCategory;
import com.example.news_service.enums.NewsArticleStatus;
import com.example.news_service.exception.ApiException;
import com.example.news_service.exception.ErrorCode;
import com.example.news_service.exception.NewsArticleAlreadyExistsException;
import com.example.news_service.exception.NewsArticleNotFoundException;
import com.example.news_service.exception.NewsCategoryNotFoundException;
import com.example.news_service.mapper.NewsArticleMapper;
import com.example.news_service.repository.NewsArticleRepository;
import com.example.news_service.repository.NewsCategoryRepository;
import com.example.news_service.security.CurrentActorIdProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NewsArticleServiceImpl implements NewsArticleService {

    private final NewsArticleRepository newsArticleRepository;
    private final NewsCategoryRepository newsCategoryRepository;
    private final NewsArticleMapper newsArticleMapper;
    private final CurrentActorIdProvider currentActorIdProvider;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NewsArticleResponse> getPublishedArticles(String keyword,
                                                                 UUID categoryId,
                                                                 Boolean featured,
                                                                 Pageable pageable) {
        return PageResponse.from(
                newsArticleRepository.search(
                        NewsArticleStatus.PUBLISHED,
                        categoryId,
                        TextUtils.trimToNull(keyword),
                        featured,
                        pageable),
                newsArticleMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NewsArticleResponse> getAllArticles(String keyword,
                                                            UUID categoryId,
                                                            NewsArticleStatus status,
                                                            Pageable pageable) {
        return PageResponse.from(
                newsArticleRepository.search(
                        status,
                        categoryId,
                        TextUtils.trimToNull(keyword),
                        null,
                        pageable),
                newsArticleMapper::toResponse);
    }

    @Override
    public NewsArticleResponse getPublishedArticleBySlug(String slug) {
        NewsArticle article = newsArticleRepository.findPublishedBySlug(slug)
                .orElseThrow(() -> new NewsArticleNotFoundException(
                        "Không tìm thấy bài viết với đường dẫn: " + slug));
        // Tăng lượt xem — dùng update query để không phụ thuộc dirty checking.
        //
        // LƯU Ý: method này KHÔNG được đánh dấu `readOnly = true` vì câu
        // UPDATE sẽ bị MySQL từ chối ("Connection is read-only"). Vì vậy
        // transaction ghi được khai báo riêng cho hàm này.
        newsArticleRepository.incrementViewCount(article.getId());
        return newsArticleMapper.toResponse(article);
    }

    @Override
    @Transactional(readOnly = true)
    public NewsArticleResponse getArticleById(UUID id) {
        return newsArticleMapper.toResponse(findArticle(id));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NewsArticleResponse> getFeaturedArticles(Pageable pageable) {
        return PageResponse.from(
                newsArticleRepository.findFeaturedPublished(pageable),
                newsArticleMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NewsArticleResponse> getRelatedArticles(UUID categoryId,
                                                                UUID excludeId,
                                                                Pageable pageable) {
        return PageResponse.from(
                newsArticleRepository.findRelatedPublished(categoryId, excludeId, pageable),
                newsArticleMapper::toResponse);
    }

    @Override
    public NewsArticleResponse createArticle(NewsArticleRequest request) {
        NewsCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), null);

        NewsArticle article = NewsArticle.builder()
                .category(category)
                .slug(slug)
                .title(request.title().trim())
                .summary(TextUtils.trimToNull(request.summary()))
                .content(TextUtils.trimToNull(request.content()))
                .thumbnailUrl(TextUtils.trimToNull(request.thumbnailUrl()))
                .authorName(resolveAuthorName(request.authorName()))
                .authorId(resolveAuthorId())
                .status(request.status() == null ? NewsArticleStatus.DRAFT : request.status())
                .isFeatured(Boolean.TRUE.equals(request.featured()))
                .viewCount(0)
                .build();

        applyPublishedAt(article, article.getStatus());
        NewsArticle saved = newsArticleRepository.save(article);
        log.info("Đã tạo bài viết: slug={}, status={}", saved.getSlug(), saved.getStatus());
        return newsArticleMapper.toResponse(saved);
    }

    @Override
    public NewsArticleResponse updateArticle(UUID id, NewsArticleRequest request) {
        NewsArticle article = findArticle(id);
        NewsCategory category = findCategory(request.categoryId());

        String slug = resolveSlug(request.slug(), request.title(), id);

        article.setCategory(category);
        article.setSlug(slug);
        article.setTitle(request.title().trim());
        article.setSummary(TextUtils.trimToNull(request.summary()));
        article.setContent(TextUtils.trimToNull(request.content()));
        article.setThumbnailUrl(TextUtils.trimToNull(request.thumbnailUrl()));
        if (TextUtils.trimToNull(request.authorName()) != null) {
            article.setAuthorName(request.authorName().trim());
        }
        if (request.status() != null) {
            article.setStatus(request.status());
            applyPublishedAt(article, request.status());
        }
        if (request.featured() != null) {
            article.setIsFeatured(request.featured());
        }

        NewsArticle saved = newsArticleRepository.save(article);
        log.info("Đã cập nhật bài viết: id={}, status={}", saved.getId(), saved.getStatus());
        return newsArticleMapper.toResponse(saved);
    }

    @Override
    public NewsArticleResponse publishArticle(UUID id) {
        NewsArticle article = findArticle(id);
        if (article.getStatus() == NewsArticleStatus.PUBLISHED) {
            throw new ApiException(ErrorCode.NEWS_ARTICLE_INVALID_STATUS,
                    "Bài viết đã ở trạng thái PUBLISHED.");
        }
        article.setStatus(NewsArticleStatus.PUBLISHED);
        applyPublishedAt(article, NewsArticleStatus.PUBLISHED);
        NewsArticle saved = newsArticleRepository.save(article);
        log.info("Đã đăng bài viết: id={}", saved.getId());
        return newsArticleMapper.toResponse(saved);
    }

    @Override
    public NewsArticleResponse unpublishArticle(UUID id) {
        NewsArticle article = findArticle(id);
        if (article.getStatus() != NewsArticleStatus.PUBLISHED) {
            throw new ApiException(ErrorCode.NEWS_ARTICLE_INVALID_STATUS,
                    "Chỉ bài viết đang PUBLISHED mới chuyển về DRAFT được.");
        }
        article.setStatus(NewsArticleStatus.DRAFT);
        NewsArticle saved = newsArticleRepository.save(article);
        log.info("Đã chuyển bài viết về bản nháp: id={}", saved.getId());
        return newsArticleMapper.toResponse(saved);
    }

    @Override
    public NewsArticleResponse archiveArticle(UUID id) {
        NewsArticle article = findArticle(id);
        if (article.getStatus() == NewsArticleStatus.ARCHIVED) {
            throw new ApiException(ErrorCode.NEWS_ARTICLE_INVALID_STATUS,
                    "Bài viết đã ở trạng thái ARCHIVED.");
        }
        article.setStatus(NewsArticleStatus.ARCHIVED);
        NewsArticle saved = newsArticleRepository.save(article);
        log.info("Đã lưu trữ bài viết: id={}", saved.getId());
        return newsArticleMapper.toResponse(saved);
    }

    @Override
    public void deleteArticle(UUID id) {
        NewsArticle article = findArticle(id);
        newsArticleRepository.delete(article);
        log.info("Đã xóa bài viết: id={}", id);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private NewsArticle findArticle(UUID id) {
        return newsArticleRepository.findById(id)
                .orElseThrow(() -> new NewsArticleNotFoundException(
                        "Không tìm thấy bài viết với id: " + id));
    }

    private NewsCategory findCategory(UUID id) {
        return newsCategoryRepository.findById(id)
                .orElseThrow(() -> new NewsCategoryNotFoundException(
                        "Không tìm thấy danh mục bài viết với id: " + id));
    }

    /**
     * Sinh slug duy nhất từ slug do client gửi hoặc từ tiêu đề.
     *
     * <p>Nếu slug trùng, thêm hậu tố {@code -2}, {@code -3}… để không đụng
     * bản ghi khác.
     */
    private String resolveSlug(String requestedSlug, String title, UUID excludeId) {
        String base = TextUtils.trimToNull(requestedSlug);
        if (base == null) {
            base = slugify(title);
        }
        if (base == null || base.isBlank()) {
            throw new ApiException(ErrorCode.NEWS_ARTICLE_SLUG_INVALID,
                    "Không tạo được đường dẫn (slug) từ tiêu đề. Vui lòng nhập slug thủ công.");
        }

        String candidate = base;
        int suffix = 2;
        while (slugExists(candidate, excludeId)) {
            candidate = base + "-" + suffix;
            suffix++;
            if (suffix > 100) {
                throw new ApiException(ErrorCode.NEWS_ARTICLE_ALREADY_EXISTS,
                        "Không tìm được đường dẫn (slug) khả dụng cho bài viết.");
            }
        }
        return candidate;
    }

    private boolean slugExists(String slug, UUID excludeId) {
        if (excludeId == null) {
            return newsArticleRepository.existsBySlugIgnoreCase(slug);
        }
        return newsArticleRepository.existsBySlugIgnoreCaseAndIdNot(slug, excludeId);
    }

    /**
     * Chuyển tiêu đề tiếng Việt thành slug: bỏ dấu, thay khoảng trắng bằng dấu gạch.
     */
    private String slugify(String title) {
        if (title == null) {
            return null;
        }
        String normalized = Normalizer.normalize(title, Normalizer.Form.NFD);
        String withoutDiacritics = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String slug = withoutDiacritics
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return slug.isBlank() ? null : slug;
    }

    /** Tên tác giả: ưu tiên giá trị client gửi, không thì lấy từ token, không thì "Ban biên tập". */
    private String resolveAuthorName(String requestedAuthorName) {
        String fromRequest = TextUtils.trimToNull(requestedAuthorName);
        if (fromRequest != null) {
            return fromRequest;
        }
        String fromToken = TextUtils.trimToNull(currentActorIdProvider.getCurrentUserName());
        return fromToken != null ? fromToken : "Ban biên tập";
    }

    /** UUID người viết (thuộc user-service) — chỉ lưu UUID, không tạo FK. */
    private String resolveAuthorId() {
        UUID actorId = currentActorIdProvider.getCurrentUserId();
        return actorId != null ? actorId.toString() : null;
    }

    /**
     * Đặt {@code publishedAt} theo trạng thái — chỉ ghi lại khi chuyển sang
     * PUBLISHED để giữ đúng thời điểm đăng đầu tiên.
     */
    private void applyPublishedAt(NewsArticle article, NewsArticleStatus status) {
        if (status == NewsArticleStatus.PUBLISHED && article.getPublishedAt() == null) {
            article.setPublishedAt(Instant.now());
        }
    }
}

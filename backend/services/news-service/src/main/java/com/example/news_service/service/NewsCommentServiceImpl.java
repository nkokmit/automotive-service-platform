package com.example.news_service.service;

import com.example.news_service.common.TextUtils;
import com.example.news_service.dto.request.NewsCommentRequest;
import com.example.news_service.dto.response.NewsCommentResponse;
import com.example.news_service.entity.NewsArticle;
import com.example.news_service.entity.NewsComment;
import com.example.news_service.exception.ApiException;
import com.example.news_service.exception.ErrorCode;
import com.example.news_service.exception.NewsArticleNotFoundException;
import com.example.news_service.exception.NewsCommentNotFoundException;
import com.example.news_service.mapper.NewsCommentMapper;
import com.example.news_service.repository.NewsArticleRepository;
import com.example.news_service.repository.NewsCommentRepository;
import com.example.news_service.security.CurrentActorIdProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NewsCommentServiceImpl implements NewsCommentService {

    private final NewsCommentRepository newsCommentRepository;
    private final NewsArticleRepository newsArticleRepository;
    private final NewsCommentMapper newsCommentMapper;
    private final CurrentActorIdProvider currentActorIdProvider;

    @Override
    @Transactional(readOnly = true)
    public List<NewsCommentResponse> getCommentsByArticle(UUID articleId) {
        return newsCommentRepository.findActiveByArticleId(articleId).stream()
                .map(newsCommentMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<NewsCommentResponse> getAllCommentsByArticle(UUID articleId) {
        return newsCommentRepository.findAllByArticleId(articleId).stream()
                .map(newsCommentMapper::toResponse)
                .toList();
    }

    @Override
    public NewsCommentResponse createComment(UUID articleId, NewsCommentRequest request) {
        NewsArticle article = newsArticleRepository.findById(articleId)
                .orElseThrow(() -> new NewsArticleNotFoundException(
                        "Không tìm thấy bài viết với id: " + articleId));

        UUID parentId = request.parentId();
        if (parentId != null) {
            // Bình luận cha phải tồn tại và thuộc cùng bài viết.
            NewsComment parent = newsCommentRepository.findById(parentId)
                    .orElseThrow(() -> new NewsCommentNotFoundException(
                            "Không tìm thấy bình luận cha với id: " + parentId));
            if (!parent.getArticle().getId().equals(articleId)) {
                throw new ApiException(ErrorCode.INVALID_REQUEST,
                        "Bình luận cha không thuộc bài viết này.");
            }
        }

        UUID userId = currentActorIdProvider.getCurrentUserId();
        String userName = TextUtils.trimToNull(currentActorIdProvider.getCurrentUserName());

        NewsComment comment = NewsComment.builder()
                .article(article)
                .userId(userId != null ? userId.toString() : null)
                .userName(userName != null ? userName : "Người dùng")
                .content(request.content().trim())
                .parentId(parentId)
                .isActive(Boolean.TRUE)
                .build();

        NewsComment saved = newsCommentRepository.save(comment);
        log.info("Đã thêm bình luận: articleId={}, commentId={}", articleId, saved.getId());
        return newsCommentMapper.toResponse(saved);
    }

    @Override
    public NewsCommentResponse setCommentActive(UUID commentId, boolean active) {
        NewsComment comment = findComment(commentId);
        comment.setIsActive(active);
        NewsComment saved = newsCommentRepository.save(comment);
        log.info("Đã {} bình luận: id={}", active ? "hiện" : "ẩn", saved.getId());
        return newsCommentMapper.toResponse(saved);
    }

    @Override
    public void deleteComment(UUID commentId) {
        NewsComment comment = findComment(commentId);
        // Người viết được xoá bình luận của chính mình; xoá bình luận của
        // người khác thì cần quyền kiểm duyệt (`NEWS_COMMENT_MODERATE`).
        if (!isOwner(comment) && !hasModerateAuthority()) {
            throw new ApiException(ErrorCode.NEWS_COMMENT_FORBIDDEN,
                    "Bạn chỉ có thể xoá bình luận của chính mình.");
        }
        newsCommentRepository.delete(comment);
        log.info("Đã xóa bình luận: id={}", commentId);
    }

    /** Bình luận này có do người đang đăng nhập viết không. */
    private boolean isOwner(NewsComment comment) {
        UUID actorId = currentActorIdProvider.getCurrentUserId();
        return actorId != null
                && actorId.toString().equals(comment.getUserId());
    }

    /** Người đang đăng nhập có quyền kiểm duyệt bình luận không. */
    private boolean hasModerateAuthority() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "NEWS_COMMENT_MODERATE".equals(authority.getAuthority()));
    }

    private NewsComment findComment(UUID id) {
        return newsCommentRepository.findById(id)
                .orElseThrow(() -> new NewsCommentNotFoundException(
                        "Không tìm thấy bình luận với id: " + id));
    }
}

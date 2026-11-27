package com.example.news_service.service;

import com.example.news_service.common.PageResponse;
import com.example.news_service.common.TextUtils;
import com.example.news_service.dto.request.NewsCategoryRequest;
import com.example.news_service.dto.response.NewsCategoryResponse;
import com.example.news_service.entity.NewsCategory;
import com.example.news_service.exception.ApiException;
import com.example.news_service.exception.ErrorCode;
import com.example.news_service.exception.NewsCategoryAlreadyExistsException;
import com.example.news_service.exception.NewsCategoryNotFoundException;
import com.example.news_service.mapper.NewsCategoryMapper;
import com.example.news_service.repository.NewsCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NewsCategoryServiceImpl implements NewsCategoryService {

    private final NewsCategoryRepository newsCategoryRepository;
    private final NewsCategoryMapper newsCategoryMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NewsCategoryResponse> getCategories(String keyword, Pageable pageable) {
        return PageResponse.from(
                newsCategoryRepository.search(TextUtils.trimToNull(keyword), pageable),
                newsCategoryMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NewsCategoryResponse> getAllCategories() {
        return newsCategoryRepository
                .findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(newsCategoryMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public NewsCategoryResponse getCategoryById(UUID id) {
        return newsCategoryMapper.toResponse(findCategory(id));
    }

    @Override
    public NewsCategoryResponse createCategory(NewsCategoryRequest request) {
        String code = request.code().trim();
        if (newsCategoryRepository.existsByCodeIgnoreCase(code)) {
            throw new NewsCategoryAlreadyExistsException("Mã danh mục bài viết đã tồn tại: " + code);
        }
        NewsCategory saved = newsCategoryRepository.save(NewsCategory.builder()
                .code(code)
                .name(request.name().trim())
                .description(TextUtils.trimToNull(request.description()))
                .build());
        log.info("Đã tạo danh mục bài viết: code={}", saved.getCode());
        return newsCategoryMapper.toResponse(saved);
    }

    @Override
    public NewsCategoryResponse updateCategory(UUID id, NewsCategoryRequest request) {
        NewsCategory category = findCategory(id);
        String code = request.code().trim();
        if (newsCategoryRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new NewsCategoryAlreadyExistsException("Mã danh mục bài viết đã tồn tại: " + code);
        }
        category.setCode(code);
        category.setName(request.name().trim());
        category.setDescription(TextUtils.trimToNull(request.description()));
        NewsCategory saved = newsCategoryRepository.save(category);
        log.info("Đã cập nhật danh mục bài viết: id={}", saved.getId());
        return newsCategoryMapper.toResponse(saved);
    }

    @Override
    public void deleteCategory(UUID id) {
        NewsCategory category = findCategory(id);
        // Chặn xoá khi danh mục còn bài viết — kể cả bài nháp/lưu trữ.
        //
        // Lý do phải tính cả bài không publish: bài bị "xoá" thực tế vẫn còn
        // dòng trong bảng `news_articles`, và FK `fk_news_articles_category`
        // là ON DELETE RESTRICT → MySQL sẽ ném lỗi 1451 nếu lệnh DELETE lọt
        // xuống tầng DB, khiến API trả 500 thay vì 400 kèm thông báo rõ ràng.
        long totalArticles = newsCategoryRepository.countArticlesByCategoryId(id);
        if (totalArticles > 0) {
            throw new ApiException(ErrorCode.NEWS_CATEGORY_IN_USE,
                    "Danh mục \"" + category.getName() + "\" còn " + totalArticles
                            + " bài viết nên không thể xóa. Hãy chuyển các bài viết sang danh mục khác trước.");
        }
        newsCategoryRepository.delete(category);
        log.info("Đã xóa danh mục bài viết: id={}", id);
    }

    private NewsCategory findCategory(UUID id) {
        return newsCategoryRepository.findById(id)
                .orElseThrow(() -> new NewsCategoryNotFoundException(
                        "Không tìm thấy danh mục bài viết với id: " + id));
    }
}

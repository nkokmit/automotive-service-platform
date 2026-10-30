package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.TextUtils;
import com.example.inventory_service.dto.request.CategoryRequest;
import com.example.inventory_service.dto.response.CategoryResponse;
import com.example.inventory_service.entity.PartCategory;
import com.example.inventory_service.exception.ApiException;
import com.example.inventory_service.exception.ErrorCode;
import com.example.inventory_service.exception.PartCategoryAlreadyExistsException;
import com.example.inventory_service.exception.PartCategoryNotFoundException;
import com.example.inventory_service.mapper.CategoryMapper;
import com.example.inventory_service.repository.PartCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PartCategoryServiceImpl implements PartCategoryService {

    private final PartCategoryRepository partCategoryRepository;
    private final CategoryMapper categoryMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CategoryResponse> getCategories(String keyword, Pageable pageable) {
        return PageResponse.from(
                partCategoryRepository.search(TextUtils.trimToNull(keyword), pageable),
                categoryMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(UUID id) {
        return categoryMapper.toResponse(findCategory(id));
    }

    @Override
    public CategoryResponse createCategory(CategoryRequest request) {
        String code = request.code().trim();
        if (partCategoryRepository.existsByCodeIgnoreCase(code)) {
            throw new PartCategoryAlreadyExistsException("Mã nhóm phụ tùng đã tồn tại: " + code);
        }
        PartCategory saved = partCategoryRepository.save(PartCategory.builder()
                .code(code)
                .name(request.name().trim())
                .description(TextUtils.trimToNull(request.description()))
                .build());
        log.info("Đã tạo nhóm phụ tùng: code={}", saved.getCode());
        return categoryMapper.toResponse(saved);
    }

    @Override
    public CategoryResponse updateCategory(UUID id, CategoryRequest request) {
        PartCategory category = findCategory(id);
        String code = request.code().trim();
        if (partCategoryRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new PartCategoryAlreadyExistsException("Mã nhóm phụ tùng đã tồn tại: " + code);
        }
        category.setCode(code);
        category.setName(request.name().trim());
        category.setDescription(TextUtils.trimToNull(request.description()));
        PartCategory saved = partCategoryRepository.save(category);
        log.info("Đã cập nhật nhóm phụ tùng: id={}", saved.getId());
        return categoryMapper.toResponse(saved);
    }

    @Override
    public void deleteCategory(UUID id) {
        PartCategory category = findCategory(id);
        if (partCategoryRepository.countPartsByCategoryId(id) > 0) {
            throw new ApiException(ErrorCode.PART_CATEGORY_IN_USE,
                    "Nhóm phụ tùng đang có phụ tùng nên không thể xóa: " + category.getCode());
        }
        partCategoryRepository.delete(category);
        log.info("Đã xóa nhóm phụ tùng: id={}", id);
    }

    private PartCategory findCategory(UUID id) {
        return partCategoryRepository.findById(id)
                .orElseThrow(() -> new PartCategoryNotFoundException("Không tìm thấy nhóm phụ tùng với id: " + id));
    }
}

package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.TextUtils;
import com.example.inventory_service.dto.request.CategoryRequest;
import com.example.inventory_service.dto.response.CategoryResponse;
import com.example.inventory_service.entity.ServiceCategory;
import com.example.inventory_service.exception.ApiException;
import com.example.inventory_service.exception.ErrorCode;
import com.example.inventory_service.exception.ServiceCategoryAlreadyExistsException;
import com.example.inventory_service.exception.ServiceCategoryNotFoundException;
import com.example.inventory_service.mapper.CategoryMapper;
import com.example.inventory_service.repository.ServiceCategoryRepository;
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
public class ServiceCategoryServiceImpl implements ServiceCategoryService {

    private final ServiceCategoryRepository serviceCategoryRepository;
    private final CategoryMapper categoryMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CategoryResponse> getCategories(String keyword, Pageable pageable) {
        return PageResponse.from(
                serviceCategoryRepository.search(TextUtils.trimToNull(keyword), pageable),
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
        if (serviceCategoryRepository.existsByCodeIgnoreCase(code)) {
            throw new ServiceCategoryAlreadyExistsException("Mã nhóm dịch vụ đã tồn tại: " + code);
        }
        ServiceCategory saved = serviceCategoryRepository.save(ServiceCategory.builder()
                .code(code)
                .name(request.name().trim())
                .description(TextUtils.trimToNull(request.description()))
                .build());
        log.info("Đã tạo nhóm dịch vụ: code={}", saved.getCode());
        return categoryMapper.toResponse(saved);
    }

    @Override
    public CategoryResponse updateCategory(UUID id, CategoryRequest request) {
        ServiceCategory category = findCategory(id);
        String code = request.code().trim();
        if (serviceCategoryRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new ServiceCategoryAlreadyExistsException("Mã nhóm dịch vụ đã tồn tại: " + code);
        }
        category.setCode(code);
        category.setName(request.name().trim());
        category.setDescription(TextUtils.trimToNull(request.description()));
        ServiceCategory saved = serviceCategoryRepository.save(category);
        log.info("Đã cập nhật nhóm dịch vụ: id={}", saved.getId());
        return categoryMapper.toResponse(saved);
    }

    @Override
    public void deleteCategory(UUID id) {
        ServiceCategory category = findCategory(id);
        if (serviceCategoryRepository.countServicesByCategoryId(id) > 0) {
            throw new ApiException(ErrorCode.SERVICE_CATEGORY_IN_USE,
                    "Nhóm dịch vụ đang có dịch vụ nên không thể xóa: " + category.getCode());
        }
        serviceCategoryRepository.delete(category);
        log.info("Đã xóa nhóm dịch vụ: id={}", id);
    }

    private ServiceCategory findCategory(UUID id) {
        return serviceCategoryRepository.findById(id)
                .orElseThrow(() -> new ServiceCategoryNotFoundException("Không tìm thấy nhóm dịch vụ với id: " + id));
    }
}

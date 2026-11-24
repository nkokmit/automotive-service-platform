package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.TextUtils;
import com.example.inventory_service.dto.request.PartCompatibilityRequest;
import com.example.inventory_service.dto.request.PartRequest;
import com.example.inventory_service.dto.request.StockAdjustmentRequest;
import com.example.inventory_service.dto.response.PartCompatibilityResponse;
import com.example.inventory_service.dto.response.PartResponse;
import com.example.inventory_service.entity.Part;
import com.example.inventory_service.entity.PartCategory;
import com.example.inventory_service.entity.PartVehicleCompatibility;
import com.example.inventory_service.exception.ApiException;
import com.example.inventory_service.exception.ErrorCode;
import com.example.inventory_service.exception.PartAlreadyExistsException;
import com.example.inventory_service.exception.PartCategoryNotFoundException;
import com.example.inventory_service.exception.PartNotFoundException;
import com.example.inventory_service.mapper.PartCompatibilityMapper;
import com.example.inventory_service.mapper.PartMapper;
import com.example.inventory_service.repository.PartCategoryRepository;
import com.example.inventory_service.repository.PartRepository;
import com.example.inventory_service.repository.PartVehicleCompatibilityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PartServiceImpl implements PartService {

    private static final int DEFAULT_MIN_STOCK_LEVEL = 5;

    private final PartRepository partRepository;
    private final PartCategoryRepository partCategoryRepository;
    private final PartVehicleCompatibilityRepository compatibilityRepository;
    private final PartMapper partMapper;
    private final PartCompatibilityMapper compatibilityMapper;
    private final StockService stockService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PartResponse> searchParts(String keyword,
                                                  String sku,
                                                  String oemCode,
                                                  String brand,
                                                  UUID categoryId,
                                                  Boolean isActive,
                                                  boolean lowStockOnly,
                                                  String vehicleBrand,
                                                  String vehicleModel,
                                                  Pageable pageable) {
        return PageResponse.from(
                partRepository.search(
                        TextUtils.trimToNull(keyword),
                        TextUtils.trimToNull(sku),
                        TextUtils.trimToNull(oemCode),
                        TextUtils.trimToNull(brand),
                        categoryId,
                        isActive,
                        lowStockOnly,
                        TextUtils.trimToNull(vehicleBrand),
                        TextUtils.trimToNull(vehicleModel),
                        pageable),
                partMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PartResponse getPartById(UUID id) {
        return partMapper.toResponse(findPart(id));
    }

    @Override
    public PartResponse createPart(PartRequest request) {
        String sku = resolveSku(request.sku(), request.name());
        PartCategory category = findCategory(request.categoryId());

        // Tồn kho và giá vốn luôn bắt đầu từ 0: chỉ đổi qua đơn nhập hàng và thao tác kho.
        Part saved = partRepository.save(Part.builder()
                .category(category)
                .sku(sku)
                .oemCode(TextUtils.trimToNull(request.oemCode()))
                .name(request.name().trim())
                .brand(TextUtils.trimToNull(request.brand()))
                .imageUrl(TextUtils.trimToNull(request.imageUrl()))
                .description(TextUtils.trimToNull(request.description()))
                .unit(request.unit().trim())
                .costPrice(BigDecimal.ZERO)
                .sellingPrice(request.sellingPrice())
                .onHandStock(0)
                .reservedStock(0)
                .minStockLevel(request.minStockLevel() == null ? DEFAULT_MIN_STOCK_LEVEL : request.minStockLevel())
                .isActive(request.isActive() == null ? Boolean.TRUE : request.isActive())
                .build());
        log.info("Đã tạo phụ tùng: sku={}", saved.getSku());

        // Tồn kho ban đầu (nếu có) được ghi vào sổ kho dưới dạng IMPORT thủ công.
        if (request.initialStock() != null && request.initialStock() > 0) {
            stockService.adjustStock(saved.getId(), new StockAdjustmentRequest(
                    StockAdjustmentRequest.StockAdjustmentMode.ADD,
                    request.initialStock(),
                    "Tồn kho ban đầu khi tạo phụ tùng"));
        }
        return partMapper.toResponse(saved);
    }

    @Override
    public PartResponse updatePart(UUID id, PartRequest request) {
        Part part = findPart(id);
        // Form admin không bắt nhập SKU nữa: để trống thì giữ nguyên SKU hiện tại.
        String sku = resolveUpdateSku(part, request);
        if (!part.getCategory().getId().equals(request.categoryId())) {
            part.setCategory(findCategory(request.categoryId()));
        }
        part.setSku(sku);
        part.setOemCode(TextUtils.trimToNull(request.oemCode()));
        part.setName(request.name().trim());
        part.setBrand(TextUtils.trimToNull(request.brand()));
        part.setImageUrl(TextUtils.trimToNull(request.imageUrl()));
        part.setDescription(TextUtils.trimToNull(request.description()));
        part.setUnit(request.unit().trim());
        part.setSellingPrice(request.sellingPrice());
        if (request.minStockLevel() != null) {
            part.setMinStockLevel(request.minStockLevel());
        }
        if (request.isActive() != null) {
            part.setIsActive(request.isActive());
        }
        Part saved = partRepository.save(part);
        log.info("Đã cập nhật phụ tùng: id={}", saved.getId());
        return partMapper.toResponse(saved);
    }

    /**
     * Chốt SKU khi tạo mới.
     *
     * <p>Nếu người dùng nhập SKU thì dùng luôn (kèm kiểm tra trùng). Nếu để trống
     * thì tự sinh mã từ tên: {@code PT-<SLUG-TÊN>-<HẬU TỐ NGẪU NHIÊN>} để người
     * dùng bình thường không phải nghĩ tới khái niệm SKU.
     */
    private String resolveSku(String requestedSku, String name) {
        String trimmed = TextUtils.trimToNull(requestedSku);
        if (trimmed != null) {
            if (partRepository.existsBySkuIgnoreCase(trimmed)) {
                throw new PartAlreadyExistsException("Mã SKU phụ tùng đã tồn tại: " + trimmed);
            }
            return trimmed;
        }
        return generateSku(name);
    }

    /**
     * Chốt SKU khi cập nhật: để trống thì giữ nguyên SKU cũ (đổi tên không nên
     * làm đổi mã), nhập thì phải không trùng với phụ tùng khác.
     */
    private String resolveUpdateSku(Part part, PartRequest request) {
        String trimmed = TextUtils.trimToNull(request.sku());
        if (trimmed == null) {
            return part.getSku();
        }
        if (partRepository.existsBySkuIgnoreCaseAndIdNot(trimmed, part.getId())) {
            throw new PartAlreadyExistsException("Mã SKU phụ tùng đã tồn tại: " + trimmed);
        }
        return trimmed;
    }

    /**
     * Sinh SKU duy nhất dạng {@code PT-DAU-NHOT-7F3A}.
     *
     * <p>Phần đầu lấy từ tên phụ tùng (bỏ dấu tiếng Việt, gộp khoảng trắng thành
     * dấu gạch), phần sau là hậu tố ngẫu nhiên để tránh trùng khi hai phụ tùng
     * trùng tên.
     */
    private String generateSku(String name) {
        String slug = Normalizer.normalize(name == null ? "" : name, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[^A-Za-z0-9]+", "-")
                .replaceAll("^-+|-+$", "")
                .toUpperCase();
        if (slug.length() > 24) {
            slug = slug.substring(0, 24).replaceAll("-+$", "");
        }
        if (slug.isEmpty()) {
            slug = "PHU-TUNG";
        }
        for (int attempt = 0; attempt < 20; attempt++) {
            String candidate = "PT-" + slug + "-" + randomSuffix();
            boolean duplicated = partRepository.existsBySkuIgnoreCase(candidate);
            if (!duplicated) {
                return candidate;
            }
        }
        throw new ApiException(ErrorCode.INVALID_REQUEST,
                "Không tạo được mã SKU tự động, vui lòng nhập SKU thủ công");
    }

    private String randomSuffix() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder builder = new StringBuilder(4);
        SecureRandom random = new SecureRandom();
        for (int i = 0; i < 4; i++) {
            builder.append(alphabet.charAt(random.nextInt(alphabet.length())));
        }
        return builder.toString();
    }

    @Override
    public void deletePart(UUID id) {
        Part part = findPart(id);
        part.setIsActive(Boolean.FALSE);
        partRepository.save(part);
        log.info("Đã vô hiệu hóa phụ tùng: id={}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PartCompatibilityResponse> getCompatibilities(UUID partId) {
        findPart(partId);
        return compatibilityRepository.findByPartIdOrderById(partId).stream()
                .map(compatibilityMapper::toResponse)
                .toList();
    }

    @Override
    public PartCompatibilityResponse addCompatibility(UUID partId, PartCompatibilityRequest request) {
        Part part = findPart(partId);
        if (request.yearFrom() != null && request.yearTo() != null
                && request.yearTo() < request.yearFrom()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Năm kết thúc phải lớn hơn hoặc bằng năm bắt đầu");
        }
        String brand = request.vehicleBrand().trim();
        String model = request.vehicleModel().trim();
        boolean duplicated = compatibilityRepository.findByPartIdAndVehicle(partId, brand, model).stream()
                .anyMatch(existing -> Objects.equals(existing.getYearFrom(), request.yearFrom())
                        && Objects.equals(existing.getYearTo(), request.yearTo()));
        if (duplicated) {
            throw new ApiException(ErrorCode.PART_COMPATIBILITY_ALREADY_EXISTS,
                    "Dòng xe tương thích đã tồn tại: " + brand + " " + model);
        }
        PartVehicleCompatibility saved = compatibilityRepository.save(PartVehicleCompatibility.builder()
                .part(part)
                .vehicleBrand(brand)
                .vehicleModel(model)
                .yearFrom(request.yearFrom())
                .yearTo(request.yearTo())
                .build());
        log.info("Đã thêm dòng xe tương thích: partId={}, vehicle={} {}", partId, brand, model);
        return compatibilityMapper.toResponse(saved);
    }

    @Override
    public void deleteCompatibility(UUID partId, UUID compatibilityId) {
        PartVehicleCompatibility compatibility = compatibilityRepository.findById(compatibilityId)
                .filter(existing -> existing.getPart().getId().equals(partId))
                .orElseThrow(() -> new ApiException(ErrorCode.PART_COMPATIBILITY_NOT_FOUND,
                        "Không tìm thấy dòng xe tương thích với id: " + compatibilityId));
        compatibilityRepository.delete(compatibility);
        log.info("Đã xóa dòng xe tương thích: id={}", compatibilityId);
    }

    private Part findPart(UUID id) {
        return partRepository.findById(id)
                .orElseThrow(() -> new PartNotFoundException("Không tìm thấy phụ tùng với id: " + id));
    }

    private PartCategory findCategory(UUID id) {
        return partCategoryRepository.findById(id)
                .orElseThrow(() -> new PartCategoryNotFoundException("Không tìm thấy nhóm phụ tùng với id: " + id));
    }
}

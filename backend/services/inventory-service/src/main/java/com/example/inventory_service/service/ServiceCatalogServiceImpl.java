package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.TextUtils;
import com.example.inventory_service.common.VehicleKeyNormalizer;
import com.example.inventory_service.dto.request.ServiceBomRequest;
import com.example.inventory_service.dto.request.ServiceBomUpdateRequest;
import com.example.inventory_service.dto.request.ServiceRequest;
import com.example.inventory_service.dto.request.ServiceVehiclePricingRequest;
import com.example.inventory_service.dto.response.InternalServiceBomResponse;
import com.example.inventory_service.dto.response.ServiceBomResponse;
import com.example.inventory_service.dto.response.ServiceQuotePartResponse;
import com.example.inventory_service.dto.response.ServiceQuoteResponse;
import com.example.inventory_service.dto.response.ServiceResponse;
import com.example.inventory_service.dto.response.ServiceVehiclePricingResponse;
import com.example.inventory_service.entity.Part;
import com.example.inventory_service.entity.Service;
import com.example.inventory_service.entity.ServiceBom;
import com.example.inventory_service.entity.ServiceCategory;
import com.example.inventory_service.entity.ServiceVehiclePricing;
import com.example.inventory_service.exception.ApiException;
import com.example.inventory_service.exception.ErrorCode;
import com.example.inventory_service.exception.PartNotFoundException;
import com.example.inventory_service.exception.ServiceAlreadyExistsException;
import com.example.inventory_service.exception.ServiceCategoryNotFoundException;
import com.example.inventory_service.exception.ServiceNotFoundException;
import com.example.inventory_service.mapper.ServiceBomMapper;
import com.example.inventory_service.mapper.ServiceMapper;
import com.example.inventory_service.repository.PartRepository;
import com.example.inventory_service.repository.ServiceBomRepository;
import com.example.inventory_service.repository.ServiceCategoryRepository;
import com.example.inventory_service.repository.ServiceRepository;
import com.example.inventory_service.repository.ServiceVehiclePricingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Entity {@code Service} trùng tên với annotation {@code @Service} của Spring,
 * nên annotation được viết đầy đủ package.
 */
@org.springframework.stereotype.Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ServiceCatalogServiceImpl implements ServiceCatalogService {

    private final ServiceRepository serviceRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServiceBomRepository serviceBomRepository;
    private final PartRepository partRepository;
    private final ServiceMapper serviceMapper;
    private final ServiceBomMapper serviceBomMapper;
    private final ServiceVehiclePricingRepository serviceVehiclePricingRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ServiceResponse> getServices(String keyword, UUID categoryId, Boolean isActive,
                                                     Pageable pageable) {
        return PageResponse.from(
                serviceRepository.search(TextUtils.trimToNull(keyword), categoryId, isActive, pageable),
                serviceMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ServiceResponse getServiceById(UUID id) {
        return serviceMapper.toResponse(findService(id));
    }

    @Override
    public ServiceResponse createService(ServiceRequest request) {
        String code = request.code().trim();
        if (serviceRepository.existsByCodeIgnoreCase(code)) {
            throw new ServiceAlreadyExistsException("Mã dịch vụ đã tồn tại: " + code);
        }
        Service saved = serviceRepository.save(Service.builder()
                .category(findCategory(request.categoryId()))
                .code(code)
                .name(request.name().trim())
                .durationMinutes(request.durationMinutes())
                .requiredTechs(request.requiredTechs())
                .baseLaborPrice(request.baseLaborPrice())
                .isActive(request.isActive() == null ? Boolean.TRUE : request.isActive())
                .build());
        log.info("Đã tạo dịch vụ: code={}", saved.getCode());
        return serviceMapper.toResponse(saved);
    }

    @Override
    public ServiceResponse updateService(UUID id, ServiceRequest request) {
        Service service = findService(id);
        String code = request.code().trim();
        if (serviceRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new ServiceAlreadyExistsException("Mã dịch vụ đã tồn tại: " + code);
        }
        if (!service.getCategory().getId().equals(request.categoryId())) {
            service.setCategory(findCategory(request.categoryId()));
        }
        service.setCode(code);
        service.setName(request.name().trim());
        service.setDurationMinutes(request.durationMinutes());
        service.setRequiredTechs(request.requiredTechs());
        service.setBaseLaborPrice(request.baseLaborPrice());
        if (request.isActive() != null) {
            service.setIsActive(request.isActive());
        }
        Service saved = serviceRepository.save(service);
        log.info("Đã cập nhật dịch vụ: id={}", saved.getId());
        return serviceMapper.toResponse(saved);
    }

    @Override
    public void deleteService(UUID id) {
        Service service = findService(id);
        service.setIsActive(Boolean.FALSE);
        serviceRepository.save(service);
        log.info("Đã vô hiệu hóa dịch vụ: id={}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceBomResponse> getBom(UUID serviceId, String brand, String model) {
        findService(serviceId);
        String normalizedBrand = TextUtils.trimToNull(brand) == null
                ? null : VehicleKeyNormalizer.normalize(brand);
        String normalizedModel = TextUtils.trimToNull(model) == null
                ? null : VehicleKeyNormalizer.normalize(model);
        List<ServiceBom> boms = normalizedBrand == null && normalizedModel == null
                ? serviceBomRepository.findByServiceIdOrderById(serviceId)
                : serviceBomRepository.searchByVehicle(serviceId, normalizedBrand, normalizedModel);
        return boms.stream()
                .map(serviceBomMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InternalServiceBomResponse> getInternalBom(UUID serviceId) {
        findService(serviceId);
        return serviceBomRepository.findByServiceIdOrderById(serviceId).stream()
                .map(bom -> new InternalServiceBomResponse(
                        bom.getPart().getId(),
                        bom.getPart().getSku(),
                        bom.getPart().getName(),
                        bom.getPart().getUnit(),
                        bom.getBrand(),
                        bom.getModel(),
                        bom.getDefaultQuantity(),
                        bom.getPart().getSellingPrice(),
                        bom.getPart().getIsActive(),
                        bom.getPart().getOnHandStock() - bom.getPart().getReservedStock()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ServiceQuoteResponse getQuote(UUID serviceId, String brand, String model) {
        Service service = findService(serviceId);
        String normalizedBrand = VehicleKeyNormalizer.normalize(brand);
        String normalizedModel = VehicleKeyNormalizer.normalize(model);

        ServiceVehiclePricing pricing = serviceVehiclePricingRepository
                .findByServiceIdAndBrandAndModel(serviceId, normalizedBrand, normalizedModel)
                .orElse(null);
        String pricingSource = "EXACT";
        if (pricing == null && !"ALL".equals(normalizedBrand)) {
            pricing = serviceVehiclePricingRepository
                    .findByServiceIdAndBrandAndModel(serviceId, normalizedBrand, VehicleKeyNormalizer.ALL)
                    .orElse(null);
            pricingSource = "BRAND";
        }
        if (pricing == null) {
            pricingSource = "BASE";
        }

        List<ServiceBom> boms = serviceBomRepository
                .findByServiceIdAndBrandAndModelOrderById(serviceId, normalizedBrand, normalizedModel);
        String bomSource = "EXACT";
        if (boms.isEmpty() && !"ALL".equals(normalizedBrand)) {
            boms = serviceBomRepository.findByServiceIdAndBrandAndModelOrderById(
                    serviceId, normalizedBrand, VehicleKeyNormalizer.ALL);
            bomSource = "BRAND";
        }
        if (boms.isEmpty() && (!"ALL".equals(normalizedBrand) || !"ALL".equals(normalizedModel))) {
            boms = serviceBomRepository.findByServiceIdAndBrandAndModelOrderById(
                    serviceId, VehicleKeyNormalizer.ALL, VehicleKeyNormalizer.ALL);
            bomSource = "DEFAULT";
        }

        return new ServiceQuoteResponse(
                service.getId(),
                service.getName(),
                normalizedBrand,
                normalizedModel,
                pricing == null ? service.getBaseLaborPrice() : pricing.getUnitPrice(),
                pricing == null ? service.getDurationMinutes() : pricing.getDurationMinutes(),
                service.getRequiredTechs(),
                service.getIsActive(),
                pricingSource,
                bomSource,
                boms.stream().map(bom -> new ServiceQuotePartResponse(
                        bom.getPart().getId(),
                        bom.getPart().getSku(),
                        bom.getPart().getName(),
                        bom.getPart().getUnit(),
                        bom.getDefaultQuantity(),
                        bom.getPart().getSellingPrice(),
                        bom.getPart().getIsActive(),
                        bom.getPart().getOnHandStock() - bom.getPart().getReservedStock()))
                        .toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceVehiclePricingResponse> getVehiclePricings(UUID serviceId) {
        findService(serviceId);
        return serviceVehiclePricingRepository.findByServiceIdOrderByBrandAscModelAsc(serviceId).stream()
                .map(this::toPricingResponse)
                .toList();
    }

    @Override
    public ServiceVehiclePricingResponse upsertVehiclePricing(
            UUID serviceId,
            ServiceVehiclePricingRequest request
    ) {
        Service service = findService(serviceId);
        String brand = VehicleKeyNormalizer.normalize(request.brand());
        String model = VehicleKeyNormalizer.normalize(request.model());
        ServiceVehiclePricing pricing = serviceVehiclePricingRepository
                .findByServiceIdAndBrandAndModel(serviceId, brand, model)
                .orElseGet(() -> ServiceVehiclePricing.builder()
                        .service(service)
                        .brand(brand)
                        .model(model)
                        .build());
        pricing.setUnitPrice(request.unitPrice());
        pricing.setDurationMinutes(request.durationMinutes());
        return toPricingResponse(serviceVehiclePricingRepository.save(pricing));
    }

    @Override
    public void deleteVehiclePricing(UUID serviceId, UUID pricingId) {
        findService(serviceId);
        ServiceVehiclePricing pricing = serviceVehiclePricingRepository.findById(pricingId)
                .filter(item -> item.getService().getId().equals(serviceId))
                .orElseThrow(() -> new ApiException(ErrorCode.SERVICE_PRICING_NOT_FOUND,
                        "Không tìm thấy cấu hình giá với id: " + pricingId));
        serviceVehiclePricingRepository.delete(pricing);
    }

    @Override
    public ServiceBomResponse addBomItem(UUID serviceId, ServiceBomRequest request) {
        Service service = findService(serviceId);
        Part part = partRepository.findById(request.partId())
                .orElseThrow(() -> new PartNotFoundException("Không tìm thấy phụ tùng với id: " + request.partId()));
        String brand = VehicleKeyNormalizer.normalize(request.brand());
        String model = VehicleKeyNormalizer.normalize(request.model());
        if (serviceBomRepository.existsByServiceIdAndPartIdAndBrandAndModel(
                serviceId, part.getId(), brand, model)) {
            throw new ApiException(ErrorCode.SERVICE_BOM_ALREADY_EXISTS,
                    "Phụ tùng đã có trong định mức của dịch vụ: " + part.getSku());
        }
        ServiceBom saved = serviceBomRepository.save(ServiceBom.builder()
                .service(service)
                .part(part)
                .brand(brand)
                .model(model)
                .defaultQuantity(request.defaultQuantity())
                .note(TextUtils.trimToNull(request.note()))
                .build());
        log.info("Đã thêm phụ tùng vào định mức: serviceId={}, partId={}", serviceId, part.getId());
        return serviceBomMapper.toResponse(saved);
    }

    @Override
    public ServiceBomResponse updateBomItem(UUID serviceId, UUID bomId, ServiceBomUpdateRequest request) {
        ServiceBom bom = findBom(serviceId, bomId);
        String brand = request.brand() == null ? bom.getBrand() : VehicleKeyNormalizer.normalize(request.brand());
        String model = request.model() == null ? bom.getModel() : VehicleKeyNormalizer.normalize(request.model());
        if ((!brand.equals(bom.getBrand()) || !model.equals(bom.getModel()))
                && serviceBomRepository.existsByServiceIdAndPartIdAndBrandAndModelAndIdNot(
                        serviceId, bom.getPart().getId(), brand, model, bomId)) {
            throw new ApiException(ErrorCode.SERVICE_BOM_ALREADY_EXISTS,
                    "Phụ tùng đã có trong định mức của dịch vụ ở cấu hình xe này");
        }
        bom.setDefaultQuantity(request.defaultQuantity());
        bom.setBrand(brand);
        bom.setModel(model);
        bom.setNote(TextUtils.trimToNull(request.note()));
        ServiceBom saved = serviceBomRepository.save(bom);
        log.info("Đã cập nhật dòng định mức: id={}", bomId);
        return serviceBomMapper.toResponse(saved);
    }

    @Override
    public void deleteBomItem(UUID serviceId, UUID bomId) {
        serviceBomRepository.delete(findBom(serviceId, bomId));
        log.info("Đã xóa dòng định mức: id={}", bomId);
    }

    private Service findService(UUID id) {
        return serviceRepository.findById(id)
                .orElseThrow(() -> new ServiceNotFoundException("Không tìm thấy dịch vụ với id: " + id));
    }

    private ServiceCategory findCategory(UUID id) {
        return serviceCategoryRepository.findById(id)
                .orElseThrow(() -> new ServiceCategoryNotFoundException("Không tìm thấy nhóm dịch vụ với id: " + id));
    }

    private ServiceBom findBom(UUID serviceId, UUID bomId) {
        return serviceBomRepository.findById(bomId)
                .filter(bom -> bom.getService().getId().equals(serviceId))
                .orElseThrow(() -> new ApiException(ErrorCode.SERVICE_BOM_NOT_FOUND,
                        "Không tìm thấy dòng định mức với id: " + bomId));
    }

    private ServiceVehiclePricingResponse toPricingResponse(ServiceVehiclePricing pricing) {
        return new ServiceVehiclePricingResponse(
                pricing.getId(),
                pricing.getService().getId(),
                pricing.getBrand(),
                pricing.getModel(),
                pricing.getUnitPrice(),
                pricing.getDurationMinutes(),
                pricing.getCreatedAt(),
                pricing.getUpdatedAt());
    }
}

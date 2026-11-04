package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.dto.request.PartCompatibilityRequest;
import com.example.inventory_service.dto.request.PartRequest;
import com.example.inventory_service.dto.response.PartCompatibilityResponse;
import com.example.inventory_service.dto.response.PartResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface PartService {

    PageResponse<PartResponse> searchParts(String keyword,
                                           String sku,
                                           String oemCode,
                                           String brand,
                                           UUID categoryId,
                                           Boolean isActive,
                                           boolean lowStockOnly,
                                           String vehicleBrand,
                                           String vehicleModel,
                                           Pageable pageable);

    PartResponse getPartById(UUID id);

    PartResponse createPart(PartRequest request);

    PartResponse updatePart(UUID id, PartRequest request);

    /**
     * Xóa mềm ({@code isActive=false}).
     */
    void deletePart(UUID id);

    List<PartCompatibilityResponse> getCompatibilities(UUID partId);

    PartCompatibilityResponse addCompatibility(UUID partId, PartCompatibilityRequest request);

    void deleteCompatibility(UUID partId, UUID compatibilityId);
}

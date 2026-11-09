package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.dto.response.InternalServiceBomResponse;
import com.example.inventory_service.dto.response.InternalServiceCatalogResponse;
import com.example.inventory_service.dto.response.InternalPartCatalogResponse;
import com.example.inventory_service.dto.response.ServiceResponse;
import com.example.inventory_service.service.PartService;
import com.example.inventory_service.service.ServiceCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * API chỉ dành cho service-to-service (token dịch vụ). Không được route qua api-gateway.
 */
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalServiceCatalogController {

    private final ServiceCatalogService serviceCatalogService;
    private final PartService partService;

    @GetMapping("/services/{serviceId}")
    @PreAuthorize("hasAuthority('INTERNAL_SERVICE_CATALOG_READ')")
    public ApiResponse<InternalServiceCatalogResponse> getService(@PathVariable UUID serviceId) {
        ServiceResponse service = serviceCatalogService.getServiceById(serviceId);
        return ApiResponse.success(new InternalServiceCatalogResponse(
                service.id(), service.name(), service.durationMinutes(),
                service.requiredTechs(), service.baseLaborPrice(), service.isActive()));
    }

    @GetMapping("/services/{serviceId}/bom")
    @PreAuthorize("hasAuthority('INTERNAL_SERVICE_CATALOG_READ')")
    public ApiResponse<List<InternalServiceBomResponse>> getServiceBom(@PathVariable UUID serviceId) {
        return ApiResponse.success(serviceCatalogService.getInternalBom(serviceId));
    }

    @GetMapping("/parts/{partId}")
    @PreAuthorize("hasAuthority('INTERNAL_PART_CATALOG_READ')")
    public ApiResponse<InternalPartCatalogResponse> getPart(@PathVariable UUID partId) {
        var part = partService.getPartById(partId);
        return ApiResponse.success(new InternalPartCatalogResponse(
                part.id(), part.sku(), part.name(), part.unit(), part.sellingPrice(), part.isActive()));
    }
}

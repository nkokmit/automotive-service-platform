package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.dto.response.InternalServiceCatalogResponse;
import com.example.inventory_service.dto.response.ServiceResponse;
import com.example.inventory_service.service.ServiceCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * API chỉ dành cho service-to-service (token dịch vụ). Không được route qua api-gateway.
 */
@RestController
@RequestMapping("/internal/services")
@RequiredArgsConstructor
public class InternalServiceCatalogController {

    private final ServiceCatalogService serviceCatalogService;

    @GetMapping("/{serviceId}")
    @PreAuthorize("hasAuthority('INTERNAL_SERVICE_CATALOG_READ')")
    public ApiResponse<InternalServiceCatalogResponse> getService(@PathVariable UUID serviceId) {
        ServiceResponse service = serviceCatalogService.getServiceById(serviceId);
        return ApiResponse.success(new InternalServiceCatalogResponse(
                service.id(), service.name(), service.durationMinutes(),
                service.requiredTechs(), service.isActive()));
    }
}

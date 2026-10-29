package com.example.inventory_service.controller;

import com.example.inventory_service.common.ApiResponse;
import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.PageableFactory;
import com.example.inventory_service.dto.request.ServiceBomRequest;
import com.example.inventory_service.dto.request.ServiceBomUpdateRequest;
import com.example.inventory_service.dto.request.ServiceRequest;
import com.example.inventory_service.dto.response.ServiceBomResponse;
import com.example.inventory_service.dto.response.ServiceResponse;
import com.example.inventory_service.service.ServiceCatalogService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
@Validated
public class ServiceController {

    private static final Set<String> SORT_FIELDS = Set.of("code", "name", "baseLaborPrice", "createdAt");

    private final ServiceCatalogService serviceCatalogService;

    @GetMapping
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    public ApiResponse<PageResponse<ServiceResponse>> getServices(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        return ApiResponse.success(serviceCatalogService.getServices(keyword, categoryId, isActive,
                PageableFactory.of(page, size, sortBy, sortDirection, SORT_FIELDS, "createdAt")));
    }

    @GetMapping("/{serviceId}")
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    public ApiResponse<ServiceResponse> getService(@PathVariable UUID serviceId) {
        return ApiResponse.success(serviceCatalogService.getServiceById(serviceId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ApiResponse<ServiceResponse> createService(@Valid @RequestBody ServiceRequest request) {
        return ApiResponse.success("Tạo dịch vụ thành công", serviceCatalogService.createService(request));
    }

    @PutMapping("/{serviceId}")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ApiResponse<ServiceResponse> updateService(@PathVariable UUID serviceId,
                                                      @Valid @RequestBody ServiceRequest request) {
        return ApiResponse.success("Cập nhật dịch vụ thành công",
                serviceCatalogService.updateService(serviceId, request));
    }

    @DeleteMapping("/{serviceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public void deleteService(@PathVariable UUID serviceId) {
        serviceCatalogService.deleteService(serviceId);
    }

    @GetMapping("/{serviceId}/bom")
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    public ApiResponse<List<ServiceBomResponse>> getBom(@PathVariable UUID serviceId) {
        return ApiResponse.success(serviceCatalogService.getBom(serviceId));
    }

    @PostMapping("/{serviceId}/bom")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ApiResponse<ServiceBomResponse> addBomItem(@PathVariable UUID serviceId,
                                                      @Valid @RequestBody ServiceBomRequest request) {
        return ApiResponse.success("Thêm phụ tùng vào định mức thành công",
                serviceCatalogService.addBomItem(serviceId, request));
    }

    @PutMapping("/{serviceId}/bom/{bomId}")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ApiResponse<ServiceBomResponse> updateBomItem(@PathVariable UUID serviceId,
                                                         @PathVariable UUID bomId,
                                                         @Valid @RequestBody ServiceBomUpdateRequest request) {
        return ApiResponse.success("Cập nhật định mức thành công",
                serviceCatalogService.updateBomItem(serviceId, bomId, request));
    }

    @DeleteMapping("/{serviceId}/bom/{bomId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public void deleteBomItem(@PathVariable UUID serviceId, @PathVariable UUID bomId) {
        serviceCatalogService.deleteBomItem(serviceId, bomId);
    }
}

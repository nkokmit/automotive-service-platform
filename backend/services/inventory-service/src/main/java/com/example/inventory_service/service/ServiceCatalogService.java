package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.dto.request.ServiceBomRequest;
import com.example.inventory_service.dto.request.ServiceBomUpdateRequest;
import com.example.inventory_service.dto.request.ServiceRequest;
import com.example.inventory_service.dto.response.ServiceBomResponse;
import com.example.inventory_service.dto.response.ServiceResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ServiceCatalogService {

    PageResponse<ServiceResponse> getServices(String keyword, UUID categoryId, Boolean isActive, Pageable pageable);

    ServiceResponse getServiceById(UUID id);

    ServiceResponse createService(ServiceRequest request);

    ServiceResponse updateService(UUID id, ServiceRequest request);

    /**
     * Xóa mềm ({@code isActive=false}).
     */
    void deleteService(UUID id);

    List<ServiceBomResponse> getBom(UUID serviceId);

    ServiceBomResponse addBomItem(UUID serviceId, ServiceBomRequest request);

    ServiceBomResponse updateBomItem(UUID serviceId, UUID bomId, ServiceBomUpdateRequest request);

    void deleteBomItem(UUID serviceId, UUID bomId);
}

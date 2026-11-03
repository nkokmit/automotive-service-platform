package com.example.booking_service.integration.inventory;

import com.example.booking_service.common.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

/**
 * Gọi API nội bộ của inventory-service qua Eureka bằng token dịch vụ (không forward JWT của khách,
 * nên khách không cần SERVICE_READ).
 */
@FeignClient(name = "inventory-service", contextId = "inventoryServiceClient",
        configuration = InventoryServiceClientConfig.class)
public interface InventoryServiceClient {

    @GetMapping("/internal/services/{serviceId}")
    ApiResponse<CatalogServiceContract> getService(@PathVariable("serviceId") UUID serviceId);
}

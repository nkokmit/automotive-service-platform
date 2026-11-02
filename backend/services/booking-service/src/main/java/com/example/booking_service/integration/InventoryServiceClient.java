package com.example.booking_service.integration;

import com.example.booking_service.common.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

/** Gọi inventory-service qua Eureka (load balancer), chuyển tiếp JWT của người gọi. */
@FeignClient(name = "inventory-service", contextId = "inventoryServiceClient")
public interface InventoryServiceClient {

    @GetMapping("/api/services/{serviceId}")
    ApiResponse<CatalogServiceContract> getService(@PathVariable("serviceId") UUID serviceId);
}

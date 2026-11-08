package com.example.work_order_service.integration.client;

import com.example.work_order_service.integration.contract.InternalServiceBomContract;
import com.example.work_order_service.integration.contract.InternalServiceCatalogContract;
import com.example.work_order_service.integration.contract.ServiceApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;

@FeignClient(
        name = "inventory-service",
        contextId = "workOrderInventoryServiceClient",
        url = "${app.integration.inventory-service-url:http://localhost:8084}",
        configuration = InventoryServiceClientConfig.class
)
public interface InventoryServiceClient {

    @GetMapping("/internal/services/{serviceId}")
    ServiceApiResponse<InternalServiceCatalogContract> getService(@PathVariable UUID serviceId);

    @GetMapping("/internal/services/{serviceId}/bom")
    ServiceApiResponse<List<InternalServiceBomContract>> getServiceBom(@PathVariable UUID serviceId);
}

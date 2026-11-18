package com.example.billing_service.integration.client;

import com.example.billing_service.integration.contract.ServiceApiResponse;
import com.example.billing_service.integration.contract.EstimateContract;
import com.example.billing_service.integration.contract.WorkOrderContract;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(
        contextId = "work-order-client",
        name = "work-order-service",
        url = "${app.integration.work-order-service-url}",
        configuration = WorkOrderClientConfig.class
)
public interface WorkOrderClient {

    @GetMapping("/api/work-orders/{id}")
    ServiceApiResponse<WorkOrderContract> getWorkOrder(@PathVariable UUID id);

    @GetMapping("/api/estimates/{estimateId}")
    ServiceApiResponse<EstimateContract> getEstimate(@PathVariable UUID estimateId);
}

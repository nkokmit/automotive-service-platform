package com.example.work_order_service.integration.client;

import com.example.work_order_service.integration.contract.ServiceApiResponse;
import com.example.work_order_service.integration.contract.StaffProfileContract;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(
        name = "staff-service",
        contextId = "workOrderStaffServiceClient",
        url = "${app.integration.staff-service-url:http://localhost:8083}",
        configuration = StaffServiceClientConfig.class
)
public interface StaffServiceClient {

    @GetMapping("/api/staff/{staffId}")
    ServiceApiResponse<StaffProfileContract> getStaffById(@PathVariable UUID staffId);

    @GetMapping("/api/staff/by-user/{userId}")
    ServiceApiResponse<StaffProfileContract> getStaffByUserId(@PathVariable UUID userId);
}

package com.example.notification_service.integration.client;

import com.example.notification_service.integration.contract.ServiceApiResponse;
import com.example.notification_service.integration.contract.StaffProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(
        name = "staff-service",
        url = "${app.integration.staff-service-url:http://localhost:8083}",
        configuration = StaffServiceClientConfig.class
)
public interface StaffServiceClient {

    @GetMapping("/api/staff/{id}")
    ServiceApiResponse<StaffProfileResponse> getStaffById(@PathVariable UUID id);
}

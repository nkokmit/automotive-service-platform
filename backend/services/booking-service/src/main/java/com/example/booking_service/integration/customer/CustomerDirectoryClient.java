package com.example.booking_service.integration.customer;

import com.example.booking_service.common.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

/** Gọi API nội bộ của customer-vehicle-service qua Eureka bằng token dịch vụ (không forward JWT của nhân viên). */
@FeignClient(name = "customer-vehicle-service", contextId = "customerDirectoryClient",
        configuration = CustomerDirectoryClientConfig.class)
public interface CustomerDirectoryClient {

    @GetMapping("/internal/customers/{id}")
    ApiResponse<CustomerProfileContract> getCustomer(@PathVariable("id") UUID id);

    @GetMapping("/internal/vehicles/{id}")
    ApiResponse<VehicleContract> getVehicle(@PathVariable("id") UUID id);
}

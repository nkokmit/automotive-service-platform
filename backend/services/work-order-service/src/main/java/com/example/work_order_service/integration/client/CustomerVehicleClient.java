package com.example.work_order_service.integration.client;

import com.example.work_order_service.integration.contract.CustomerContract;
import com.example.work_order_service.integration.contract.ServiceApiResponse;
import com.example.work_order_service.integration.contract.VehicleContract;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(
        name = "customer-vehicle-service",
        url = "${app.integration.customer-vehicle-service-url:http://localhost:8082}",
        configuration = CustomerVehicleClientConfig.class
)
public interface CustomerVehicleClient {

    @GetMapping("/internal/customers/{id}")
    ServiceApiResponse<CustomerContract> getCustomer(@PathVariable UUID id);

    @GetMapping("/internal/vehicles/{id}")
    ServiceApiResponse<VehicleContract> getVehicle(@PathVariable UUID id);
}

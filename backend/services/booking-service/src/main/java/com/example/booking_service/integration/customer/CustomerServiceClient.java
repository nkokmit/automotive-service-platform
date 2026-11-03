package com.example.booking_service.integration.customer;

import com.example.booking_service.common.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "customer-vehicle-service", contextId = "customerServiceClient")
public interface CustomerServiceClient {

    @GetMapping("/api/customers/me")
    ApiResponse<CustomerContract> getCurrentCustomer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );
}

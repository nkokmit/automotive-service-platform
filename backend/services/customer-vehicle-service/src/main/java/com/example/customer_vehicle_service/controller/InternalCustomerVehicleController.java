package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.common.ApiResponse;
import com.example.customer_vehicle_service.dto.request.InternalCustomerFindOrCreateRequest;
import com.example.customer_vehicle_service.dto.response.CustomerResponse;
import com.example.customer_vehicle_service.dto.response.VehicleResponse;
import com.example.customer_vehicle_service.service.CustomerService;
import com.example.customer_vehicle_service.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * API chỉ dành cho service-to-service (token dịch vụ). Không được route qua api-gateway.
 */
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalCustomerVehicleController {

    private final CustomerService customerService;
    private final VehicleService vehicleService;

    @GetMapping("/customers/{id}")
    @PreAuthorize("hasAuthority('INTERNAL_CUSTOMER_READ')")
    public ApiResponse<CustomerResponse> getCustomer(@PathVariable UUID id) {
        return ApiResponse.success(customerService.getCustomerById(id));
    }

    @PostMapping("/customers/find-or-create")
    @PreAuthorize("hasAuthority('INTERNAL_CUSTOMER_WRITE')")
    public ApiResponse<CustomerResponse> findOrCreateCustomer(
            @Valid @RequestBody InternalCustomerFindOrCreateRequest request
    ) {
        return ApiResponse.success(customerService.findOrCreateByPhone(request));
    }

    @GetMapping("/vehicles/{id}")
    @PreAuthorize("hasAuthority('INTERNAL_VEHICLE_READ')")
    public ApiResponse<VehicleResponse> getVehicle(@PathVariable UUID id) {
        return ApiResponse.success(vehicleService.getVehicleById(id));
    }
}

package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.common.ApiResponse;
import com.example.customer_vehicle_service.dto.response.CustomerResponse;
import com.example.customer_vehicle_service.dto.response.CustomerIdentityResponse;
import com.example.customer_vehicle_service.dto.response.CustomerSummaryResponse;
import com.example.customer_vehicle_service.dto.response.VehicleResponse;
import com.example.customer_vehicle_service.dto.response.VehicleSummaryResponse;
import com.example.customer_vehicle_service.service.CustomerService;
import com.example.customer_vehicle_service.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
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

    @GetMapping("/customers/by-user/{userId}")
    @PreAuthorize("hasAuthority('INTERNAL_CUSTOMER_READ')")
    public ApiResponse<CustomerIdentityResponse> getCustomerByUserId(@PathVariable UUID userId) {
        return ApiResponse.success(customerService.getCustomerIdentityByUserId(userId));
    }

    /**
     * Lấy hồ sơ nhiều khách hàng theo id trong MỘT lần gọi.
     *
     * <p>Dùng cho danh sách quản trị (mỗi trang có tới hàng chục khách) — gọi
     * từng khách sẽ tạo N+1 request giữa các service. Khách hàng không tồn
     * tại (hoặc đã xoá mềm) đơn giản là không có trong kết quả.
     */
    @GetMapping("/customers/batch")
    @PreAuthorize("hasAuthority('INTERNAL_CUSTOMER_READ')")
    public ApiResponse<List<CustomerSummaryResponse>> getCustomersBatch(
            @RequestParam List<UUID> ids
    ) {
        return ApiResponse.success(customerService.getCustomerSummaries(ids));
    }

    @GetMapping("/vehicles/{id}")
    @PreAuthorize("hasAuthority('INTERNAL_VEHICLE_READ')")
    public ApiResponse<VehicleResponse> getVehicle(@PathVariable UUID id) {
        return ApiResponse.success(vehicleService.getVehicleById(id));
    }

    /**
     * Lấy hồ sơ nhiều xe theo id trong MỘT lần gọi.
     *
     * <p>Dùng cho danh sách quản trị (mỗi trang có tới hàng chục xe) — gọi từng
     * xe sẽ tạo N+1 request giữa các service. Xe không tồn tại (hoặc đã xoá mềm)
     * đơn giản là không có trong kết quả.
     */
    @GetMapping("/vehicles/batch")
    @PreAuthorize("hasAuthority('INTERNAL_VEHICLE_READ')")
    public ApiResponse<List<VehicleSummaryResponse>> getVehiclesBatch(
            @RequestParam List<UUID> ids
    ) {
        return ApiResponse.success(vehicleService.getVehicleSummaries(ids));
    }
}

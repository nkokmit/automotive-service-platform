package com.example.work_order_service.integration.client;

import com.example.work_order_service.integration.contract.CustomerContract;
import com.example.work_order_service.integration.contract.CustomerIdentityContract;
import com.example.work_order_service.integration.contract.CustomerSummaryContract;
import com.example.work_order_service.integration.contract.ServiceApiResponse;
import com.example.work_order_service.integration.contract.VehicleContract;
import com.example.work_order_service.integration.contract.VehicleSummaryContract;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

@FeignClient(
        name = "customer-vehicle-service",
        url = "${app.integration.customer-vehicle-service-url:http://localhost:8082}",
        configuration = CustomerVehicleClientConfig.class
)
public interface CustomerVehicleClient {

    @GetMapping("/internal/customers/{id}")
    ServiceApiResponse<CustomerContract> getCustomer(@PathVariable UUID id);

    @GetMapping("/internal/customers/by-user/{userId}")
    ServiceApiResponse<CustomerIdentityContract> getCustomerByUserId(@PathVariable UUID userId);

    /**
     * Lấy nhiều hồ sơ khách hàng trong MỘT lần gọi.
     *
     * <p>Dùng cho danh sách quản trị đánh giá — gọi từng khách sẽ tạo N+1
     * request liên service.
     */
    @GetMapping("/internal/customers/batch")
    ServiceApiResponse<List<CustomerSummaryContract>> getCustomersBatch(
            @RequestParam("ids") List<UUID> ids);

    @GetMapping("/internal/vehicles/{id}")
    ServiceApiResponse<VehicleContract> getVehicle(@PathVariable UUID id);

    /**
     * Lấy nhiều hồ sơ xe trong MỘT lần gọi.
     *
     * <p>Dùng cho danh sách quản trị đánh giá — gọi từng xe sẽ tạo N+1 request
     * liên service.
     */
    @GetMapping("/internal/vehicles/batch")
    ServiceApiResponse<List<VehicleSummaryContract>> getVehiclesBatch(
            @RequestParam("ids") List<UUID> ids);
}

package com.example.billing_service.integration.client;

import com.example.billing_service.integration.contract.ServiceApiResponse;
import com.example.billing_service.integration.contract.ServiceCatalogContract;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

/**
 * Gọi {@code inventory-service} để biết nhóm dịch vụ của từng dịch vụ.
 *
 * <p>Chỉ dùng cho báo cáo "doanh thu theo nhóm dịch vụ" — cần nhóm của service
 * khác nên phải gọi API nội bộ, không được đọc chéo database.
 */
@FeignClient(
        name = "inventory-service",
        url = "${app.integration.inventory-service-url:http://localhost:8084}",
        configuration = InventoryServiceClientConfig.class
)
public interface InventoryServiceClient {

    /**
     * Lấy danh mục dịch vụ + nhóm dịch vụ trong MỘT lần gọi.
     *
     * <p>Báo cáo có thể gom hàng chục dịch vụ — gọi từng dịch vụ sẽ tạo N+1
     * request liên service.
     */
    @GetMapping("/internal/services/catalog/batch")
    ServiceApiResponse<List<ServiceCatalogContract>> getServiceCatalogBatch(
            @RequestParam("ids") List<UUID> ids);
}

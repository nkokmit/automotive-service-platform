package com.example.billing_service.integration.contract;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/**
 * Danh mục dịch vụ + nhóm dịch vụ, lấy từ {@code inventory-service}.
 *
 * <p>Báo cáo "doanh thu theo nhóm dịch vụ" cần biết mỗi dịch vụ thuộc nhóm nào.
 * Nhóm dịch vụ thuộc sở hữu của {@code inventory-service} nên phải gọi API nội
 * bộ của service đó, không được đọc chéo database (GLOBAL_RULES §1).
 */
public record ServiceCatalogContract(
        UUID id,
        String name,
        @JsonProperty("category_id") UUID categoryId,
        @JsonProperty("category_name") String categoryName
) {
}

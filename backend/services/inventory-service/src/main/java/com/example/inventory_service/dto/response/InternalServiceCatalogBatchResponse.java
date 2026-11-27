package com.example.inventory_service.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/**
 * Danh mục dịch vụ + nhóm dịch vụ, dùng cho service nội bộ.
 *
 * <p>Báo cáo doanh thu của {@code billing-service} cần biết mỗi dịch vụ thuộc
 * nhóm nào để gom doanh thu theo nhóm. Nhóm dịch vụ thuộc sở hữu của service này
 * nên phải expose qua API nội bộ, không được đọc chéo database.
 */
public record InternalServiceCatalogBatchResponse(
        UUID id,
        String name,
        @JsonProperty("category_id") UUID categoryId,
        @JsonProperty("category_name") String categoryName
) {
}

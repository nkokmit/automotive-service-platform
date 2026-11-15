package com.example.booking_service.integration.inventory;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/**
 * Phần catalog dịch vụ mà booking-service đọc từ inventory-service
 * ({@code GET /internal/services/{id}}). Tên {@code duration_minutes} / {@code required_techs}
 * giữ snake_case theo contract của inventory-service.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CatalogServiceContract(
        UUID id,
        String name,
        @JsonProperty("duration_minutes") Integer durationMinutes,
        @JsonProperty("required_techs") Integer requiredTechs,
        Boolean isActive
) {
}

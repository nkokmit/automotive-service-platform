package com.example.inventory_service.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/** Dữ liệu catalog tối thiểu cho service nội bộ: không có giá công, nhóm hay mã dịch vụ. */
public record InternalServiceCatalogResponse(
        UUID id,
        String name,
        @JsonProperty("duration_minutes") Integer durationMinutes,
        @JsonProperty("required_techs") Integer requiredTechs,
        Boolean isActive
) {
}

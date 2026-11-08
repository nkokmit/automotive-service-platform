package com.example.work_order_service.dto.request;

import com.example.work_order_service.enums.EstimateType;
import jakarta.validation.constraints.NotNull;

public record CreateEstimateRequest(
        @NotNull EstimateType type
) {
}

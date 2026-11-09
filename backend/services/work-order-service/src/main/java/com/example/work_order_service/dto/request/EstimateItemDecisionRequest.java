package com.example.work_order_service.dto.request;

import com.example.work_order_service.enums.EstimateItemDecision;
import com.example.work_order_service.enums.EstimateItemType;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record EstimateItemDecisionRequest(
        @NotNull EstimateItemType itemType,
        @NotNull UUID itemId,
        @NotNull EstimateItemDecision decision
) {
}

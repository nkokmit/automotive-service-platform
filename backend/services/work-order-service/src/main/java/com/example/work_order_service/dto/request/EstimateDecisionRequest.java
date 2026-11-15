package com.example.work_order_service.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record EstimateDecisionRequest(
        @NotEmpty List<@NotNull @Valid EstimateItemDecisionRequest> items
) {
}

package com.example.work_order_service.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record AddPartToEstimateRequest(
        @NotNull UUID partId,
        @NotNull @Positive Integer quantity
) {
}

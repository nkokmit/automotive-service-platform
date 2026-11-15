package com.example.work_order_service.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddServiceToEstimateRequest(
        @NotNull UUID serviceId
) {
}

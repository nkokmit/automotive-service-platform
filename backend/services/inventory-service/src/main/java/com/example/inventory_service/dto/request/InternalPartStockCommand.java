package com.example.inventory_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record InternalPartStockCommand(
        @NotNull UUID workOrderId,
        @NotNull UUID partId,
        @NotNull @Positive Integer quantity,
        @NotBlank @Size(max = 160) String idempotencyKey,
        @NotNull UUID requestedBy
) {
}

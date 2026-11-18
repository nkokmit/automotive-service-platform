package com.example.billing_service.integration.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EstimateContract(
        UUID id,
        UUID workOrderId,
        String status,
        List<ServiceLineContract> serviceLines,
        List<PartLineContract> partLines
) {
    public EstimateContract {
        serviceLines = serviceLines == null ? List.of() : List.copyOf(serviceLines);
        partLines = partLines == null ? List.of() : List.copyOf(partLines);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ServiceLineContract(
            UUID id,
            UUID serviceId,
            String snapshotName,
            BigDecimal unitPrice,
            BigDecimal totalPrice,
            String status
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PartLineContract(
            UUID id,
            UUID partId,
            String snapshotName,
            String snapshotSku,
            Integer issuedQuantity,
            BigDecimal unitPrice
    ) {
    }
}

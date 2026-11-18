package com.example.billing_service.integration.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WorkOrderContract(
        UUID id,
        String code,
        UUID bookingId,
        UUID customerId,
        UUID vehicleId,
        String status,
        List<EstimateSummaryContract> estimates
) {
    public WorkOrderContract {
        estimates = estimates == null ? List.of() : List.copyOf(estimates);
    }
}

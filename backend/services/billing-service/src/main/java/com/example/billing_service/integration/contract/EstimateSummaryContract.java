package com.example.billing_service.integration.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EstimateSummaryContract(UUID id, String status) {
}

package com.example.booking_service.integration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CustomerContract(UUID id, Boolean isActive) {
}

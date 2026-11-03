package com.example.booking_service.integration;

import java.util.UUID;

public record CurrentCustomerIdentity(UUID userId, UUID customerId) {
}

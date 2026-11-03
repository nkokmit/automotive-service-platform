package com.example.booking_service.integration.customer;

import java.util.UUID;

public record CurrentCustomerIdentity(UUID userId, UUID customerId) {
}

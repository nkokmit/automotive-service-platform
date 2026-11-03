package com.example.booking_service.integration.customer;

public record CustomerCreateCommand(String fullName, String phone, String email, Boolean isActive) {
}

package com.example.booking_service.integration;

public record CustomerCreateCommand(String fullName, String phone, String email, Boolean isActive) {
}

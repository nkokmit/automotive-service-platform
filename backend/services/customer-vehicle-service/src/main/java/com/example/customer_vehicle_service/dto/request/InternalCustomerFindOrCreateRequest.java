package com.example.customer_vehicle_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InternalCustomerFindOrCreateRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Size(max = 20) String phone,
        @Email @Size(max = 255) String email
) {
}

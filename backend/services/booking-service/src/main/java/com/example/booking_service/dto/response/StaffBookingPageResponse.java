package com.example.booking_service.dto.response;

import java.util.List;

public record StaffBookingPageResponse(
        List<StaffBookingResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}

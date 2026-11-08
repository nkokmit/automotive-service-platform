package com.example.work_order_service.dto.response;

import java.util.UUID;

public record CustomerSummaryResponse(
        UUID id,
        String fullName,
        String phone
) {
}

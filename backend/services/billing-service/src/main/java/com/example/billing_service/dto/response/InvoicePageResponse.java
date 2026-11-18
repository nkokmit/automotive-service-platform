package com.example.billing_service.dto.response;

import java.util.List;

public record InvoicePageResponse(
        List<InvoiceSummaryResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public InvoicePageResponse {
        items = List.copyOf(items);
    }
}

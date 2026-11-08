package com.example.work_order_service.dto.response;

import java.util.List;

public record WorkOrderPageResponse(
        List<WorkOrderListItemResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public WorkOrderPageResponse {
        items = List.copyOf(items);
    }
}

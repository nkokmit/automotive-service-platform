package com.example.booking_service.capacity;

import java.time.Instant;
import java.util.List;

/**
 * Kết quả kiểm tra sức chứa trên toàn bộ {@code [requestStart, requestEnd)}.
 * Lỗi phụ thuộc service (Inventory/Staff) không nằm ở đây mà được ném dưới dạng
 * {@code ApiException(INTEGRATION_SERVICE_UNAVAILABLE)}.
 */
public record CapacityCheckResult(Instant requestStart, Instant requestEnd, List<CapacityDeficit> deficits) {

    public CapacityCheckResult {
        deficits = List.copyOf(deficits);
    }

    public boolean feasible() {
        return deficits.isEmpty();
    }
}

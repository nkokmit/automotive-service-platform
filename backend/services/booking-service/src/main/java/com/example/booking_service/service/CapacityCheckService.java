package com.example.booking_service.service;

import com.example.booking_service.capacity.CapacityCheckResult;
import com.example.booking_service.capacity.ServiceSlot;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CapacityCheckService {

    /**
     * Kiểm tra garage có đủ kỹ thuật viên cho chuỗi dịch vụ nối tiếp bắt đầu tại
     * {@code start} hay không. Thiếu nhân sự trả về {@link CapacityCheckResult} không khả thi;
     * lỗi Inventory/Staff ném {@code ApiException(INTEGRATION_SERVICE_UNAVAILABLE)}.
     */
    CapacityCheckResult check(Instant start, List<ServiceSlot> slots);

    /** Như {@link #check(Instant, List)} nhưng tự lấy snapshot dịch vụ từ Inventory Service. */
    CapacityCheckResult checkServices(Instant start, List<UUID> serviceIds);

    /** Lấy và kiểm tra snapshot dịch vụ theo đúng thứ tự khách chọn. */
    List<ServiceSlot> resolveServiceSlots(List<UUID> serviceIds);
}

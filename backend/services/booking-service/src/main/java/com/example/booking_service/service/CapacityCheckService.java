package com.example.booking_service.service;

import com.example.booking_service.capacity.CapacityCheckResult;
import com.example.booking_service.capacity.CapacityWindow;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.capacity.SupplyInterval;

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

    /**
     * Checks capacity using supply fetched before the write transaction and current persisted
     * booking demand. Intended for booking creation while holding the capacity day lock.
     */
    CapacityCheckResult check(Instant start, List<ServiceSlot> slots, List<SupplyInterval> supply);

    /** Checks a rescheduled booking while excluding its currently held demand. */
    CapacityCheckResult check(
            Instant start,
            List<ServiceSlot> slots,
            List<SupplyInterval> supply,
            UUID excludedBookingId
    );

    /** Loads supply and existing demand once for evaluating many candidate start times. */
    CapacityWindow prepareWindow(Instant start, Instant end);

    /** Checks a candidate against a preloaded window (availability search only). */
    CapacityCheckResult check(Instant start, List<ServiceSlot> slots, CapacityWindow window);

    /** Fetches normalized-source input from Staff Service before a write transaction. */
    List<SupplyInterval> prepareSupply(Instant start, Instant end);

    /** Như {@link #check(Instant, List)} nhưng tự lấy snapshot dịch vụ từ Inventory Service. */
    CapacityCheckResult checkServices(Instant start, List<UUID> serviceIds);

    /** Lấy và kiểm tra snapshot dịch vụ theo đúng thứ tự khách chọn. */
    List<ServiceSlot> resolveServiceSlots(List<UUID> serviceIds);
}

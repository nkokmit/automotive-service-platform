package com.example.booking_service.capacity;

import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Dựng chuỗi nhu cầu nối tiếp từ thời điểm bắt đầu và danh sách dịch vụ theo thứ tự
 * (PLAN §5.3). Mỗi dịch vụ có mức nhu cầu riêng; không lấy max cho cả booking.
 */
public final class SequentialDemandBuilder {

    private SequentialDemandBuilder() {
    }

    public static List<DemandInterval> build(Instant start, List<ServiceSlot> slots) {
        if (start == null) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_TIME, "Thiếu thời điểm bắt đầu");
        }
        if (slots == null || slots.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Danh sách dịch vụ không được rỗng");
        }
        List<DemandInterval> intervals = new ArrayList<>(slots.size());
        Instant cursor = start;
        for (ServiceSlot slot : slots) {
            validate(slot);
            Instant end = cursor.plus(Duration.ofMinutes(slot.durationMinutes()));
            intervals.add(new DemandInterval(cursor, end, slot.requiredTechnicians()));
            cursor = end;
        }
        return List.copyOf(intervals);
    }

    private static void validate(ServiceSlot slot) {
        if (slot == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Dịch vụ không hợp lệ");
        }
        if (slot.durationMinutes() <= 0) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Thời lượng dịch vụ phải > 0: " + slot.serviceId());
        }
        if (slot.requiredTechnicians() < 1) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Số kỹ thuật viên của dịch vụ phải >= 1: " + slot.serviceId());
        }
    }
}

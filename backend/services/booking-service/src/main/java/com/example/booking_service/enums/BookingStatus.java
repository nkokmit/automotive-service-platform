package com.example.booking_service.enums;

import java.util.Arrays;
import java.util.List;

public enum BookingStatus {
    CONFIRMED,
    CANCELLED,
    NO_SHOW,
    CHECKED_IN,
    FULFILLED;

    /** Nguồn duy nhất cho danh sách trạng thái đang giữ sức chứa (dùng cho truy vấn). */
    public static List<BookingStatus> capacityHoldingStatuses() {
        return Arrays.stream(values()).filter(BookingStatus::holdsCapacity).toList();
    }

    public boolean holdsCapacity() {
        return this == CONFIRMED || this == CHECKED_IN;
    }
}

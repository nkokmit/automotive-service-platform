package com.example.booking_service.enumtest;

import com.example.booking_service.enums.BookingStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BookingStatusTest {

    @Test
    void onlyActiveLifecycleStatusesHoldCapacity() {
        assertTrue(BookingStatus.CONFIRMED.holdsCapacity());
        assertTrue(BookingStatus.CHECKED_IN.holdsCapacity());
        assertFalse(BookingStatus.CANCELLED.holdsCapacity());
        assertFalse(BookingStatus.NO_SHOW.holdsCapacity());
        assertFalse(BookingStatus.FULFILLED.holdsCapacity());
    }
}

package com.example.booking_service.service;

import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingStatusHistory;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.repository.BookingStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class BookingStatusHistoryServiceImplTest {

    private BookingStatusHistoryRepository repository;
    private BookingStatusHistoryServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(BookingStatusHistoryRepository.class);
        service = new BookingStatusHistoryServiceImpl(repository);
    }

    @Test
    void recordsInitialConfirmedStatusWithoutFromStatus() {
        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .status(BookingStatus.CONFIRMED)
                .build();
        UUID changedBy = UUID.randomUUID();

        service.recordInitialStatus(booking, changedBy, "Tạo booking");

        ArgumentCaptor<BookingStatusHistory> captor = ArgumentCaptor.forClass(BookingStatusHistory.class);
        verify(repository).save(captor.capture());
        BookingStatusHistory history = captor.getValue();
        assertNull(history.getFromStatus());
        assertEquals(BookingStatus.CONFIRMED, history.getToStatus());
        assertEquals(changedBy, history.getChangedBy());
        assertEquals("Tạo booking", history.getReason());
        assertEquals(booking, history.getBooking());
    }

    @Test
    void recordsStatusTransitionAndUpdatesBooking() {
        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .status(BookingStatus.CONFIRMED)
                .build();
        UUID changedBy = UUID.randomUUID();

        service.recordTransition(
                booking,
                BookingStatus.CONFIRMED,
                BookingStatus.CANCELLED,
                changedBy,
                "Khách yêu cầu hủy"
        );

        ArgumentCaptor<BookingStatusHistory> captor = ArgumentCaptor.forClass(BookingStatusHistory.class);
        verify(repository).save(captor.capture());
        BookingStatusHistory history = captor.getValue();
        assertEquals(BookingStatus.CONFIRMED, history.getFromStatus());
        assertEquals(BookingStatus.CANCELLED, history.getToStatus());
        assertEquals(BookingStatus.CANCELLED, booking.getStatus());
    }

    @Test
    void rejectsTransitionWithoutChangingStatus() {
        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .status(BookingStatus.CONFIRMED)
                .build();

        assertThrows(ApiException.class, () ->
                service.recordTransition(
                        booking,
                        BookingStatus.CONFIRMED,
                        BookingStatus.CONFIRMED,
                        null,
                        null
                ));
    }
}

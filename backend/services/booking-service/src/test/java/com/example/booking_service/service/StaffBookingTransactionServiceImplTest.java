package com.example.booking_service.service;

import com.example.booking_service.entity.Booking;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import com.example.booking_service.repository.BookingRepository;
import com.example.booking_service.repository.BookingServiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StaffBookingTransactionServiceImplTest {

    private static final UUID BOOKING_ID = UUID.randomUUID();
    private static final UUID STAFF_ID = UUID.randomUUID();
    private static final UUID VEHICLE_ID = UUID.randomUUID();

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingServiceRepository bookingServiceRepository;
    @Mock
    private BookingStatusHistoryService historyService;

    private StaffBookingTransactionServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new StaffBookingTransactionServiceImpl(bookingRepository, bookingServiceRepository,
                historyService, ZoneId.of("Asia/Ho_Chi_Minh"));
        lenient().when(bookingServiceRepository.findAllByBookingIds(any())).thenReturn(List.of());
    }

    private Booking booking(BookingStatus status, Instant startAt, UUID vehicleId) {
        Booking booking = Booking.builder().id(BOOKING_ID).customerId(UUID.randomUUID()).vehicleId(vehicleId)
                .licensePlateSnapshot("51A-123.45").startAt(startAt).endAt(startAt.plusSeconds(3600))
                .status(status).build();
        when(bookingRepository.findByIdForUpdate(BOOKING_ID)).thenReturn(Optional.of(booking));
        return booking;
    }

    @Test
    void checkInRequiresLinkedVehicle() {
        booking(BookingStatus.CONFIRMED, Instant.now(), null);

        ApiException ex = assertThrows(ApiException.class, () -> service.checkIn(BOOKING_ID, STAFF_ID));

        assertEquals(ErrorCode.CHECK_IN_REQUIREMENTS_NOT_MET, ex.getErrorCode());
        verify(historyService, never()).recordTransition(any(), any(), any(), any(), any());
    }

    @Test
    void checkInMovesConfirmedBookingToCheckedIn() {
        Booking booking = booking(BookingStatus.CONFIRMED, Instant.now(), VEHICLE_ID);

        service.checkIn(BOOKING_ID, STAFF_ID);

        assertEquals(true, booking.getCheckedInAt() != null);
        verify(historyService).recordTransition(booking, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN,
                STAFF_ID, "STAFF_CHECK_IN");
    }

    @Test
    void checkInIsIdempotent() {
        booking(BookingStatus.CHECKED_IN, Instant.now(), VEHICLE_ID);

        service.checkIn(BOOKING_ID, STAFF_ID);

        verify(historyService, never()).recordTransition(any(), any(), any(), any(), any());
    }

    @Test
    void noShowOnlyAfterStartTime() {
        booking(BookingStatus.CONFIRMED, Instant.now().plusSeconds(3600), null);

        ApiException ex = assertThrows(ApiException.class,
                () -> service.updateStatus(BOOKING_ID, BookingStatus.NO_SHOW, null, STAFF_ID));

        assertEquals(ErrorCode.INVALID_BOOKING_STATUS_TRANSITION, ex.getErrorCode());
    }

    @Test
    void noShowAfterStartTimeIsRecorded() {
        Booking booking = booking(BookingStatus.CONFIRMED, Instant.now().minusSeconds(3600), null);

        service.updateStatus(BOOKING_ID, BookingStatus.NO_SHOW, null, STAFF_ID);

        verify(historyService).recordTransition(booking, BookingStatus.CONFIRMED, BookingStatus.NO_SHOW,
                STAFF_ID, "STAFF_NO_SHOW");
    }

    @Test
    void genericStatusEndpointRejectsCancelAndCheckedIn() {
        booking(BookingStatus.CONFIRMED, Instant.now().plusSeconds(3600), null);

        assertThrows(ApiException.class,
                () -> service.updateStatus(BOOKING_ID, BookingStatus.CANCELLED, null, STAFF_ID));
        assertThrows(ApiException.class,
                () -> service.updateStatus(BOOKING_ID, BookingStatus.CHECKED_IN, null, STAFF_ID));
    }

    @Test
    void linkVehicleRejectsPlateMismatch() {
        booking(BookingStatus.CONFIRMED, Instant.now().plusSeconds(3600), null);

        ApiException ex = assertThrows(ApiException.class,
                () -> service.linkVehicle(BOOKING_ID, VEHICLE_ID, "30H-99999"));

        assertEquals(ErrorCode.VEHICLE_PLATE_MISMATCH, ex.getErrorCode());
    }

    @Test
    void linkVehicleIgnoresPlateFormattingAndIsIdempotent() {
        Booking booking = booking(BookingStatus.CONFIRMED, Instant.now().plusSeconds(3600), null);

        service.linkVehicle(BOOKING_ID, VEHICLE_ID, "51a 12345");
        assertEquals(VEHICLE_ID, booking.getVehicleId());

        service.linkVehicle(BOOKING_ID, VEHICLE_ID, "51A-12345");
    }

    @Test
    void linkVehicleRejectsDifferentVehicleWhenAlreadyLinked() {
        booking(BookingStatus.CONFIRMED, Instant.now().plusSeconds(3600), UUID.randomUUID());

        ApiException ex = assertThrows(ApiException.class,
                () -> service.linkVehicle(BOOKING_ID, VEHICLE_ID, "51A-12345"));

        assertEquals(ErrorCode.VEHICLE_ALREADY_LINKED, ex.getErrorCode());
    }
}

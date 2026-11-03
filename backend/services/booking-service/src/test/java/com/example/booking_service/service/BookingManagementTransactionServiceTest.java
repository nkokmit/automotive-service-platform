package com.example.booking_service.service;

import com.example.booking_service.capacity.CapacityCheckResult;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.capacity.SupplyInterval;
import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingService;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import com.example.booking_service.repository.BookingRepository;
import com.example.booking_service.repository.BookingServiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingManagementTransactionServiceTest {

    private static final UUID BOOKING_ID = UUID.randomUUID();
    private static final UUID CUSTOMER_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID SERVICE_ID = UUID.randomUUID();

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingServiceRepository bookingServiceRepository;
    @Mock
    private CapacityCheckService capacityCheckService;
    @Mock
    private BookingStatusHistoryService bookingStatusHistoryService;

    private BookingManagementTransactionService service;
    private Booking booking;
    private BookingService line;

    @BeforeEach
    void setUp() {
        service = new BookingManagementTransactionService(bookingRepository, bookingServiceRepository,
                capacityCheckService, bookingStatusHistoryService, ZoneId.of("Asia/Ho_Chi_Minh"));
        Instant start = Instant.now().plusSeconds(86_400);
        booking = Booking.builder()
                .id(BOOKING_ID)
                .customerId(CUSTOMER_ID)
                .licensePlateSnapshot("51A-12345")
                .startAt(start)
                .endAt(start.plusSeconds(1800))
                .status(BookingStatus.CONFIRMED)
                .createdAt(start.minusSeconds(86_400))
                .updatedAt(start.minusSeconds(86_400))
                .build();
        line = BookingService.builder()
                .booking(booking)
                .serviceId(SERVICE_ID)
                .serviceNameSnapshot("Oil change")
                .estimatedDurationMinutes(30)
                .requiredTechniciansSnapshot(1)
                .sequenceNumber(1)
                .build();
    }

    @Test
    void cancellationReleasesCapacityAndRecordsOnlyOneTransition() {
        when(bookingRepository.findByIdAndCustomerIdForUpdate(BOOKING_ID, CUSTOMER_ID))
                .thenReturn(Optional.of(booking));
        when(bookingServiceRepository.findByBookingIdOrderBySequenceNumberAsc(BOOKING_ID))
                .thenReturn(List.of(line));
        doAnswer(invocation -> {
            Booking target = invocation.getArgument(0);
            target.setStatus(invocation.getArgument(2));
            return null;
        }).when(bookingStatusHistoryService).recordTransition(
                any(), eq(BookingStatus.CONFIRMED), eq(BookingStatus.CANCELLED), eq(USER_ID),
                eq("Customer request"));
        when(bookingRepository.lockCapacityDay(any())).thenAnswer(invocation -> {
            java.time.LocalDate date = invocation.getArgument(0);
            return java.sql.Date.valueOf(date);
        });

        var response = service.cancel(CUSTOMER_ID, USER_ID, BOOKING_ID, " Customer request ");

        assertEquals(BookingStatus.CANCELLED, response.status());
        InOrder order = inOrder(bookingRepository, bookingStatusHistoryService);
        order.verify(bookingRepository).insertCapacityDayLockIfAbsent(any());
        order.verify(bookingRepository).lockCapacityDay(any());
        order.verify(bookingStatusHistoryService).recordTransition(
                booking, BookingStatus.CONFIRMED, BookingStatus.CANCELLED, USER_ID, "Customer request");
        order.verify(bookingRepository).saveAndFlush(booking);
    }

    @Test
    void repeatedCancellationDoesNotWriteAnotherTransition() {
        booking.setStatus(BookingStatus.CANCELLED);
        when(bookingRepository.findByIdAndCustomerIdForUpdate(BOOKING_ID, CUSTOMER_ID))
                .thenReturn(Optional.of(booking));
        when(bookingServiceRepository.findByBookingIdOrderBySequenceNumberAsc(BOOKING_ID))
                .thenReturn(List.of(line));

        var response = service.cancel(CUSTOMER_ID, USER_ID, BOOKING_ID, "another reason");

        assertEquals(BookingStatus.CANCELLED, response.status());
        verify(bookingRepository, never()).insertCapacityDayLockIfAbsent(any());
        verify(bookingStatusHistoryService, never()).recordTransition(any(), any(), any(), any(), any());
        verify(bookingRepository, never()).saveAndFlush(any());
    }

    @Test
    void customerCannotReadAnotherCustomersBooking() {
        when(bookingRepository.findByIdAndCustomerId(BOOKING_ID, CUSTOMER_ID)).thenReturn(Optional.empty());

        ApiException exception = assertThrows(ApiException.class,
                () -> service.findMine(CUSTOMER_ID, BOOKING_ID));

        assertEquals(ErrorCode.BOOKING_NOT_FOUND, exception.getErrorCode());
        verify(bookingServiceRepository, never()).findByBookingIdOrderBySequenceNumberAsc(BOOKING_ID);
    }

    @Test
    void failedRescheduleKeepsExistingBookingAndDoesNotSave() {
        Instant requestedStart = booking.getStartAt().plusSeconds(86_400);
        List<ServiceSlot> snapshots = List.of(new ServiceSlot(SERVICE_ID, "Oil change", 30, 1));
        List<SupplyInterval> supply = List.of(new SupplyInterval(UUID.randomUUID(),
                requestedStart, requestedStart.plusSeconds(1800)));
        when(bookingRepository.findByIdAndCustomerIdForUpdate(BOOKING_ID, CUSTOMER_ID))
                .thenReturn(Optional.of(booking));
        when(bookingRepository.lockCapacityDay(any())).thenAnswer(invocation -> {
            java.time.LocalDate date = invocation.getArgument(0);
            return java.sql.Date.valueOf(date);
        });
        when(capacityCheckService.check(requestedStart, snapshots, supply, BOOKING_ID))
                .thenReturn(new CapacityCheckResult(requestedStart, requestedStart.plusSeconds(1800), List.of(
                        new com.example.booking_service.capacity.CapacityDeficit(
                                requestedStart, requestedStart.plusSeconds(1800), 2, 1))));

        ApiException exception = assertThrows(ApiException.class, () -> service.reschedule(
                CUSTOMER_ID, BOOKING_ID, requestedStart, snapshots, supply));

        assertEquals(ErrorCode.INSUFFICIENT_TECHNICIAN_CAPACITY, exception.getErrorCode());
        assertEquals(BookingStatus.CONFIRMED, booking.getStatus());
        verify(bookingRepository, never()).saveAndFlush(any());
    }

    @Test
    void rescheduleExcludesItsOwnCapacityAndCommitsOnlyAfterCapacityPasses() {
        Instant requestedStart = booking.getStartAt().plusSeconds(86_400);
        Instant requestedEnd = requestedStart.plusSeconds(1800);
        List<ServiceSlot> snapshots = List.of(new ServiceSlot(SERVICE_ID, "Oil change", 30, 1));
        List<SupplyInterval> supply = List.of(new SupplyInterval(UUID.randomUUID(), requestedStart, requestedEnd));
        when(bookingRepository.findByIdAndCustomerIdForUpdate(BOOKING_ID, CUSTOMER_ID))
                .thenReturn(Optional.of(booking));
        when(bookingServiceRepository.findByBookingIdOrderBySequenceNumberAsc(BOOKING_ID))
                .thenReturn(List.of(line));
        when(bookingRepository.lockCapacityDay(any())).thenAnswer(invocation -> {
            java.time.LocalDate date = invocation.getArgument(0);
            return java.sql.Date.valueOf(date);
        });
        when(capacityCheckService.check(requestedStart, snapshots, supply, BOOKING_ID))
                .thenReturn(new CapacityCheckResult(requestedStart, requestedEnd, List.of()));

        var response = service.reschedule(CUSTOMER_ID, BOOKING_ID, requestedStart, snapshots, supply);

        assertEquals(requestedStart, response.startAt());
        assertEquals(requestedEnd, response.endAt());
        assertEquals(BookingStatus.CONFIRMED, response.status());
        verify(capacityCheckService).check(requestedStart, snapshots, supply, BOOKING_ID);
        verify(bookingRepository).saveAndFlush(booking);
    }
}

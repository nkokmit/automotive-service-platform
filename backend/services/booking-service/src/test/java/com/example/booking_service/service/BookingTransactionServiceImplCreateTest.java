package com.example.booking_service.service;

import com.example.booking_service.capacity.CapacityCheckResult;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.capacity.SupplyInterval;
import com.example.booking_service.dto.request.BookingCreateRequest;
import com.example.booking_service.dto.response.BookingResponse;
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
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingTransactionServiceImplCreateTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID CUSTOMER_ID = UUID.randomUUID();
    private static final UUID SERVICE_ID = UUID.randomUUID();
    private static final Instant START = Instant.parse("2026-11-05T01:00:00Z");
    private static final java.time.LocalDate LOCK_DATE = java.time.LocalDate.of(2026, 11, 5);
    private static final Instant END = START.plusSeconds(1800);

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookingServiceRepository bookingServiceRepository;
    @Mock
    private CapacityCheckService capacityCheckService;
    @Mock
    private BookingStatusHistoryService bookingStatusHistoryService;

    private BookingTransactionServiceImpl service;
    private BookingCreateRequest request;
    private List<ServiceSlot> serviceSlots;
    private List<SupplyInterval> supply;

    @BeforeEach
    void setUp() {
        service = new BookingTransactionServiceImpl(
                bookingRepository, bookingServiceRepository, capacityCheckService,                 bookingStatusHistoryService,
                                java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
                        request = new BookingCreateRequest(START, List.of(SERVICE_ID), "  51A-12345 ", "  note  ");
        serviceSlots = List.of(new ServiceSlot(SERVICE_ID, "Oil change", 30, 1));
        supply = List.of(new SupplyInterval(UUID.randomUUID(), START, END));
        when(bookingRepository.lockCapacityDay(LOCK_DATE)).thenReturn(java.sql.Date.valueOf(LOCK_DATE));
    }

    @Test
    void locksBeforeRecheckingAndPersistsConfirmedSnapshotAndHistory() {
        when(capacityCheckService.check(START, serviceSlots, supply))
                .thenReturn(new CapacityCheckResult(START, END, List.of()));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking booking = invocation.getArgument(0);
            booking.setId(UUID.randomUUID());
            booking.setCreatedAt(Instant.now());
            booking.setUpdatedAt(booking.getCreatedAt());
            return booking;
        });

        BookingResponse response = service.create(request, CUSTOMER_ID, USER_ID, serviceSlots, supply);

        assertEquals(BookingStatus.CONFIRMED, response.status());
        assertEquals(CUSTOMER_ID, response.customerId());
        assertNull(response.vehicleId());
        assertEquals("51A-12345", response.licensePlateSnapshot());
        assertEquals("note", response.customerNote());
        assertEquals(1, response.services().getFirst().sequenceNumber());

        ArgumentCaptor<Iterable<BookingService>> services = ArgumentCaptor.forClass(Iterable.class);
        InOrder order = inOrder(bookingRepository, capacityCheckService, bookingServiceRepository,
                bookingStatusHistoryService);
        order.verify(bookingRepository).insertCapacityDayLockIfAbsent(LOCK_DATE);
        order.verify(bookingRepository).lockCapacityDay(LOCK_DATE);
        order.verify(capacityCheckService).check(START, serviceSlots, supply);
        order.verify(bookingRepository).save(any(Booking.class));
        order.verify(bookingServiceRepository).saveAll(services.capture());
        order.verify(bookingStatusHistoryService).recordInitialStatus(
                any(Booking.class), org.mockito.ArgumentMatchers.eq(USER_ID), org.mockito.ArgumentMatchers.eq(
                        "CUSTOMER_BOOKING_CREATED"));

        BookingService savedLine = services.getValue().iterator().next();
        assertEquals(SERVICE_ID, savedLine.getServiceId());
        assertEquals("Oil change", savedLine.getServiceNameSnapshot());
        assertEquals(30, savedLine.getEstimatedDurationMinutes());
        assertEquals(1, savedLine.getRequiredTechniciansSnapshot());
        assertEquals(1, savedLine.getSequenceNumber());
    }

    @Test
    void doesNotPersistWhenCapacityIsInsufficient() {
        when(capacityCheckService.check(START, serviceSlots, supply))
                .thenReturn(new CapacityCheckResult(START, END,
                        List.of(new com.example.booking_service.capacity.CapacityDeficit(START, END, 2, 1))));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.create(request, CUSTOMER_ID, USER_ID, serviceSlots, supply));

        assertEquals(ErrorCode.INSUFFICIENT_TECHNICIAN_CAPACITY, exception.getErrorCode());
        verify(bookingRepository, never()).save(any());
        verify(bookingServiceRepository, never()).saveAll(any());
        verify(bookingStatusHistoryService, never()).recordInitialStatus(any(), any(), any());
    }
}

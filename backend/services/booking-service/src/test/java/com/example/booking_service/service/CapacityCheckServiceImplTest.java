package com.example.booking_service.service;

import com.example.booking_service.capacity.CapacityCheckResult;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.common.ApiResponse;
import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingService;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import com.example.booking_service.integration.CatalogServiceContract;
import com.example.booking_service.integration.InventoryServiceClient;
import com.example.booking_service.integration.StaffScheduleClient;
import com.example.booking_service.integration.StaffScheduleContract;
import com.example.booking_service.repository.BookingRepository;
import com.example.booking_service.repository.BookingServiceRepository;
import feign.FeignException;
import feign.Request;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CapacityCheckServiceImplTest {

    private static final Instant START = Instant.parse("2026-11-02T01:00:00Z"); // 08:00 +07

    private InventoryServiceClient inventory;
    private StaffScheduleClient staff;
    private BookingRepository bookings;
    private BookingServiceRepository bookingServices;
    private CapacityCheckServiceImpl service;

    @BeforeEach
    void setUp() {
        inventory = mock(InventoryServiceClient.class);
        staff = mock(StaffScheduleClient.class);
        bookings = mock(BookingRepository.class);
        bookingServices = mock(BookingServiceRepository.class);
        service = new CapacityCheckServiceImpl(inventory, staff, bookings, bookingServices,
                ZoneId.of("Asia/Ho_Chi_Minh"));
    }

    private ServiceSlot slot(int minutes, int technicians) {
        return new ServiceSlot(UUID.randomUUID(), "svc", minutes, technicians);
    }

    private StaffScheduleContract worker(Instant from, Instant to) {
        return new StaffScheduleContract(UUID.randomUUID(), List.of(
                new StaffScheduleContract.Day(List.of(new StaffScheduleContract.Interval(from, to)))));
    }

    private FeignException feign(int status) {
        Request request = Request.create(Request.HttpMethod.GET, "http://x", Map.of(), null,
                StandardCharsets.UTF_8, null);
        return FeignException.errorStatus("call", feign.Response.builder().request(request).status(status)
                .headers(Collections.emptyMap()).build());
    }

    @Test
    void feasibleWhenSupplyCoversNewBookingAndNoExistingLoad() {
        when(staff.getGarageSchedule(anyString(), anyString())).thenReturn(ApiResponse.success(List.of(
                worker(START, START.plusSeconds(7200)))));
        when(bookings.findCapacityBookingsOverlapping(any(), any(), anyList())).thenReturn(List.of());

        CapacityCheckResult result = service.check(START, List.of(slot(60, 1)));

        assertTrue(result.feasible());
    }

    @Test
    void usesSnapshotLinesOfExistingBookingStartedEarlier() {
        Booking existing = Booking.builder().id(UUID.randomUUID())
                .startAt(START.minusSeconds(1800)).status(BookingStatus.CONFIRMED).build();
        BookingService line = BookingService.builder().booking(existing).serviceId(UUID.randomUUID())
                .serviceNameSnapshot("svc").sequenceNumber(1).estimatedDurationMinutes(90)
                .requiredTechniciansSnapshot(1).build();
        when(staff.getGarageSchedule(anyString(), anyString())).thenReturn(ApiResponse.success(List.of(
                worker(START.minusSeconds(3600), START.plusSeconds(7200)))));
        when(bookings.findCapacityBookingsOverlapping(any(), any(), anyList())).thenReturn(List.of(existing));
        when(bookingServices.findAllByBookingIds(anyCollection())).thenReturn(List.of(line));

        assertFalse(service.check(START, List.of(slot(60, 1))).feasible());
    }

    @Test
    void staffFailureIsIntegrationErrorNotZeroSupply() {
        when(staff.getGarageSchedule(anyString(), anyString())).thenThrow(feign(503));

        ApiException exception = assertThrows(ApiException.class, () -> service.check(START, List.of(slot(60, 1))));

        assertEquals(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE, exception.getErrorCode());
    }

    @Test
    void emptyStaffScheduleIsRealShortageNotError() {
        when(staff.getGarageSchedule(anyString(), anyString())).thenReturn(ApiResponse.success(List.of()));
        when(bookings.findCapacityBookingsOverlapping(any(), any(), anyList())).thenReturn(List.of());

        assertFalse(service.check(START, List.of(slot(60, 1))).feasible());
    }

    @Test
    void inventoryServerErrorIsIntegrationError() {
        UUID id = UUID.randomUUID();
        when(inventory.getService(eq(id))).thenThrow(feign(500));

        ApiException exception = assertThrows(ApiException.class, () -> service.resolveServiceSlots(List.of(id)));

        assertEquals(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE, exception.getErrorCode());
    }

    @Test
    void missingServiceMapsToServiceNotFound() {
        UUID id = UUID.randomUUID();
        when(inventory.getService(eq(id))).thenThrow(feign(400));

        ApiException exception = assertThrows(ApiException.class, () -> service.resolveServiceSlots(List.of(id)));

        assertEquals(ErrorCode.SERVICE_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    void inactiveServiceIsRejected() {
        UUID id = UUID.randomUUID();
        when(inventory.getService(eq(id))).thenReturn(ApiResponse.success(
                new CatalogServiceContract(id, "svc", 30, 1, false)));

        ApiException exception = assertThrows(ApiException.class, () -> service.resolveServiceSlots(List.of(id)));

        assertEquals(ErrorCode.SERVICE_UNAVAILABLE, exception.getErrorCode());
    }

    @Test
    void invalidCatalogDataIsNotDefaulted() {
        UUID id = UUID.randomUUID();
        when(inventory.getService(eq(id))).thenReturn(ApiResponse.success(
                new CatalogServiceContract(id, "svc", null, 1, true)));

        ApiException exception = assertThrows(ApiException.class, () -> service.resolveServiceSlots(List.of(id)));

        assertEquals(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE, exception.getErrorCode());
    }

    @Test
    void resolvesSlotsInRequestedOrderAndFetchesDuplicatesOnce() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        when(inventory.getService(eq(first))).thenReturn(ApiResponse.success(
                new CatalogServiceContract(first, "A", 30, 1, true)));
        when(inventory.getService(eq(second))).thenReturn(ApiResponse.success(
                new CatalogServiceContract(second, "B", 60, 3, true)));

        List<ServiceSlot> slots = service.resolveServiceSlots(List.of(first, second, first));

        assertEquals(List.of(first, second, first), slots.stream().map(ServiceSlot::serviceId).toList());
        assertEquals(3, slots.get(1).requiredTechnicians());
        verify(inventory, times(1)).getService(first);
    }
}

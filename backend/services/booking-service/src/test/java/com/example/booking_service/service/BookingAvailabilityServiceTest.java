package com.example.booking_service.service;

import com.example.booking_service.capacity.CapacityCheckResult;
import com.example.booking_service.capacity.CapacityWindow;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.dto.response.AvailabilitySlotResponse;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingAvailabilityServiceTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final UUID SERVICE_ID = UUID.randomUUID();

    @Mock
    private CapacityCheckService capacityCheckService;

    private BookingAvailabilityService service;

    @BeforeEach
    void setUp() {
        service = new BookingAvailabilityService(capacityCheckService, ZONE);
    }

    @Test
    void preparesCapacityOnceAndUsesConfiguredSlotGrid() {
        LocalDate day = LocalDate.now(ZONE).plusDays(2);
        List<ServiceSlot> services = List.of(new ServiceSlot(SERVICE_ID, "Oil change", 45, 1));
        when(capacityCheckService.resolveServiceSlots(List.of(SERVICE_ID))).thenReturn(services);
        when(capacityCheckService.prepareWindow(any(), any())).thenAnswer(invocation ->
                new CapacityWindow(invocation.getArgument(0), invocation.getArgument(1), List.of(), List.of()));
        when(capacityCheckService.check(any(), eq(services), any(CapacityWindow.class))).thenAnswer(invocation -> {
            Instant start = invocation.getArgument(0);
            return new CapacityCheckResult(start, start.plus(Duration.ofMinutes(45)), List.of());
        });

        List<AvailabilitySlotResponse> available = service.findAvailable(day, day, List.of(SERVICE_ID));

        assertEquals(48, available.size());
        assertEquals(day.atStartOfDay(ZONE).toInstant(), available.getFirst().startAt());
        assertEquals(Duration.ofMinutes(30),
                Duration.between(available.get(0).startAt(), available.get(1).startAt()));
        verify(capacityCheckService).prepareWindow(any(), any());
        verify(capacityCheckService, never()).checkServices(any(), anyList());
    }

    @Test
    void rejectsDuplicateServicesBeforeCallingDependencies() {
        LocalDate day = LocalDate.now(ZONE).plusDays(1);

        ApiException exception = assertThrows(ApiException.class,
                () -> service.findAvailable(day, day, List.of(SERVICE_ID, SERVICE_ID)));

        assertEquals(ErrorCode.INVALID_REQUEST, exception.getErrorCode());
        verify(capacityCheckService, never()).resolveServiceSlots(anyList());
    }

    @Test
    void rejectsSearchRangesLongerThanConfiguredLimit() {
        ReflectionTestUtils.setField(service, "maxDays", 2);
        LocalDate from = LocalDate.now(ZONE).plusDays(1);

        ApiException exception = assertThrows(ApiException.class,
                () -> service.findAvailable(from, from.plusDays(2), List.of(SERVICE_ID)));

        assertEquals(ErrorCode.INVALID_REQUEST, exception.getErrorCode());
        verify(capacityCheckService, never()).resolveServiceSlots(anyList());
    }
}

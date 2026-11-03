package com.example.booking_service.service;

import com.example.booking_service.capacity.CapacityCheckResult;
import com.example.booking_service.capacity.CapacityWindow;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.common.ServiceSelectionValidator;
import com.example.booking_service.dto.response.AvailabilitySlotResponse;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingAvailabilityServiceImpl implements BookingAvailabilityService {

    private final CapacityCheckService capacityCheckService;
    private final ZoneId scheduleZoneId;

    @Value("${app.booking.availability.slot-interval-minutes:30}")
    private int slotIntervalMinutes = 30;

    @Value("${app.booking.availability.max-days:14}")
    private int maxDays = 14;

    @Override
    public List<AvailabilitySlotResponse> findAvailable(
            LocalDate from,
            LocalDate to,
            List<UUID> serviceIds
    ) {
        validateSearchRange(from, to);
        ServiceSelectionValidator.validateUnique(serviceIds);
        List<ServiceSlot> services = capacityCheckService.resolveServiceSlots(serviceIds);

        Instant searchStart = from.atStartOfDay(scheduleZoneId).toInstant();
        Instant searchEnd = to.plusDays(1).atStartOfDay(scheduleZoneId).toInstant();
        long totalDurationMinutes = services.stream()
                .mapToLong(ServiceSlot::durationMinutes)
                .sum();
        CapacityWindow window = capacityCheckService.prepareWindow(
                searchStart, searchEnd.plus(Duration.ofMinutes(totalDurationMinutes)));

        Duration slotStep = Duration.ofMinutes(slotIntervalMinutes);
        Instant now = Instant.now();
        List<AvailabilitySlotResponse> available = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            Instant dayStart = day.atStartOfDay(scheduleZoneId).toInstant();
            Instant nextDayStart = day.plusDays(1).atStartOfDay(scheduleZoneId).toInstant();
            for (Instant candidate = dayStart; candidate.isBefore(nextDayStart); candidate = candidate.plus(slotStep)) {
                if (!candidate.isAfter(now)) {
                    continue;
                }
                CapacityCheckResult result = capacityCheckService.check(candidate, services, window);
                if (result.feasible()) {
                    available.add(new AvailabilitySlotResponse(result.requestStart(), result.requestEnd()));
                }
            }
        }
        return List.copyOf(available);
    }

    private void validateSearchRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_TIME, "Khoảng ngày tìm kiếm không hợp lệ");
        }
        if (slotIntervalMinutes < 1 || slotIntervalMinutes > 1440 || maxDays < 1) {
            throw new IllegalStateException("Booking availability configuration is invalid");
        }
        long days = Duration.between(from.atStartOfDay(), to.plusDays(1).atStartOfDay()).toDays();
        if (days > maxDays) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Khoảng tìm kiếm không được vượt quá " + maxDays + " ngày");
        }
    }
}

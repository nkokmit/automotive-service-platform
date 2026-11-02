package com.example.booking_service.capacity;

import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingService;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Dựng lại nhu cầu của các booking đang giữ sức chứa (PLAN §5.5).
 *
 * <p>Chuỗi dịch vụ luôn được cộng dồn từ {@code start_at} thật của booking, không phải từ
 * {@code reqStart}. Việc cắt theo cửa sổ kiểm tra do {@link CapacitySweepLineCalculator} làm.
 * Booking không có dòng dịch vụ nào là dữ liệu hỏng: báo lỗi thay vì coi như không tốn
 * nhân lực, vì bỏ sót sẽ làm đặt vượt sức chứa.
 */
public final class ExistingDemandReconstructor {

    private ExistingDemandReconstructor() {
    }

    public static List<DemandInterval> reconstruct(List<Booking> bookings, List<BookingService> serviceLines) {
        Map<UUID, List<BookingService>> linesByBooking = serviceLines.stream()
                .collect(Collectors.groupingBy(line -> line.getBooking().getId()));

        List<DemandInterval> result = new ArrayList<>();
        for (Booking booking : bookings) {
            List<BookingService> lines = linesByBooking.getOrDefault(booking.getId(), List.of());
            if (lines.isEmpty()) {
                throw new IllegalStateException("Booking " + booking.getId() + " không có dòng dịch vụ nào");
            }
            List<ServiceSlot> slots = lines.stream()
                    .sorted(Comparator.comparing(BookingService::getSequenceNumber))
                    .map(line -> new ServiceSlot(
                            line.getServiceId(),
                            line.getServiceNameSnapshot(),
                            line.getEstimatedDurationMinutes(),
                            line.getRequiredTechniciansSnapshot()))
                    .toList();
            result.addAll(SequentialDemandBuilder.build(booking.getStartAt(), slots));
        }
        return List.copyOf(result);
    }
}

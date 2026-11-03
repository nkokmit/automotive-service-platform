package com.example.booking_service.service;

import com.example.booking_service.capacity.CapacityCheckResult;
import com.example.booking_service.capacity.CapacitySweepLineCalculator;
import com.example.booking_service.capacity.CapacityWindow;
import com.example.booking_service.capacity.DemandInterval;
import com.example.booking_service.capacity.ExistingDemandReconstructor;
import com.example.booking_service.capacity.SequentialDemandBuilder;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.capacity.SupplyInterval;
import com.example.booking_service.capacity.SupplyNormalizer;
import com.example.booking_service.common.ApiResponse;
import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingService;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import com.example.booking_service.integration.CatalogServiceContract;
import com.example.booking_service.integration.IntegrationCallRetrier;
import com.example.booking_service.integration.InventoryServiceClient;
import com.example.booking_service.integration.StaffScheduleClient;
import com.example.booking_service.integration.StaffScheduleContract;
import com.example.booking_service.repository.BookingRepository;
import com.example.booking_service.repository.BookingServiceRepository;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Điều phối kiểm tra sức chứa (PLAN §5.9). Không khai báo transaction ở đây để tránh giữ
 * kết nối DB trong lúc chờ Inventory/Staff. Các thao tác ghi gọi phương thức kiểm tra sau khi
 * lấy khóa ngày để truy vấn tải hiện tại trong cùng transaction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CapacityCheckServiceImpl implements CapacityCheckService {

    private final InventoryServiceClient inventoryServiceClient;
    private final StaffScheduleClient staffScheduleClient;
    private final BookingRepository bookingRepository;
    private final BookingServiceRepository bookingServiceRepository;
    private final ZoneId scheduleZoneId;
    private final IntegrationCallRetrier integrationCallRetrier;

    @Override
    public List<ServiceSlot> resolveServiceSlots(List<UUID> serviceIds) {
        if (serviceIds == null || serviceIds.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Danh sách dịch vụ không được rỗng");
        }
        Map<UUID, ServiceSlot> cache = new HashMap<>();
        List<ServiceSlot> slots = new ArrayList<>(serviceIds.size());
        for (UUID serviceId : serviceIds) {
            if (serviceId == null) {
                throw new ApiException(ErrorCode.INVALID_REQUEST, "Mã dịch vụ không được rỗng");
            }
            slots.add(cache.computeIfAbsent(serviceId, this::fetchSlot));
        }
        return List.copyOf(slots);
    }

    @Override
    public CapacityCheckResult checkServices(Instant start, List<UUID> serviceIds) {
        return check(start, resolveServiceSlots(serviceIds));
    }

    @Override
    public CapacityCheckResult check(Instant start, List<ServiceSlot> slots) {
        List<DemandInterval> newDemand = SequentialDemandBuilder.build(start, slots);
        Instant end = newDemand.get(newDemand.size() - 1).end();

        return evaluate(start, end, newDemand, fetchSupply(start, end), loadExistingDemand(start, end));
    }

    @Override
    public CapacityCheckResult check(Instant start, List<ServiceSlot> slots, List<SupplyInterval> supply) {
        List<DemandInterval> newDemand = SequentialDemandBuilder.build(start, slots);
        Instant end = newDemand.get(newDemand.size() - 1).end();
        return evaluate(start, end, newDemand, supply, loadExistingDemand(start, end));
    }

    @Override
    public CapacityCheckResult check(
            Instant start,
            List<ServiceSlot> slots,
            List<SupplyInterval> supply,
            UUID excludedBookingId
    ) {
        if (excludedBookingId == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Thiếu booking cần loại trừ khi đổi lịch");
        }
        List<DemandInterval> newDemand = SequentialDemandBuilder.build(start, slots);
        Instant end = newDemand.get(newDemand.size() - 1).end();
        return evaluate(start, end, newDemand, supply, loadExistingDemand(start, end, excludedBookingId));
    }

    @Override
    public CapacityWindow prepareWindow(Instant start, Instant end) {
        if (start == null || end == null || !start.isBefore(end)) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_TIME, "Khoảng tìm kiếm không hợp lệ");
        }
        return new CapacityWindow(start, end, fetchSupply(start, end), loadExistingDemand(start, end));
    }

    @Override
    public CapacityCheckResult check(Instant start, List<ServiceSlot> slots, CapacityWindow window) {
        List<DemandInterval> newDemand = SequentialDemandBuilder.build(start, slots);
        Instant end = newDemand.get(newDemand.size() - 1).end();
        if (window == null || !window.contains(start, end)) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_TIME,
                    "Khoảng kiểm tra nằm ngoài cửa sổ capacity đã chuẩn bị");
        }
        return evaluate(start, end, newDemand, window.supply(), window.existingDemand());
    }

    @Override
    public List<SupplyInterval> prepareSupply(Instant start, Instant end) {
        if (start == null || end == null || !start.isBefore(end)) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_TIME, "Khoảng kiểm tra capacity không hợp lệ");
        }
        return fetchSupply(start, end);
    }

    private CapacityCheckResult evaluate(
            Instant start,
            Instant end,
            List<DemandInterval> newDemand,
            List<SupplyInterval> supply,
            List<DemandInterval> existingDemand
    ) {
        List<SupplyInterval> normalizedSupply = SupplyNormalizer.normalize(supply, start, end);
        CapacityCheckResult result = CapacitySweepLineCalculator.check(
                start, end, normalizedSupply, existingDemand, newDemand);
        if (!result.feasible()) {
            log.info("Không đủ sức chứa trong [{}, {}): {} đoạn thiếu", start, end, result.deficits().size());
        }
        return result;
    }

    private ServiceSlot fetchSlot(UUID serviceId) {
        CatalogServiceContract service;
        try {
            service = unwrap(integrationCallRetrier.execute(
                    "inventory-service", () -> inventoryServiceClient.getService(serviceId)), "inventory-service");
        } catch (FeignException.NotFound | FeignException.BadRequest exception) {
            // inventory-service trả HTTP 400 kèm mã 4101 khi không có dịch vụ.
            throw new ApiException(ErrorCode.SERVICE_NOT_FOUND, "Không tìm thấy dịch vụ: " + serviceId);
        } catch (FeignException exception) {
            throw integrationFailure("inventory-service", exception);
        }

        if (!Boolean.TRUE.equals(service.isActive())) {
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE, "Dịch vụ không còn được cung cấp: " + serviceId);
        }
        if (!serviceId.equals(service.id()) || service.name() == null || service.name().isBlank()
                || service.name().length() > 150) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Inventory Service trả snapshot thiếu hoặc không khớp mã/tên dịch vụ: " + serviceId);
        }
        Integer duration = service.durationMinutes();
        Integer technicians = service.requiredTechs();
        if (duration == null || duration <= 0 || technicians == null || technicians < 1) {
            // Không tự đặt giá trị mặc định khi catalog thiếu hoặc sai dữ liệu (PLAN §3.1).
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Dữ liệu thời lượng/kỹ thuật viên của dịch vụ không hợp lệ: " + serviceId);
        }
        return new ServiceSlot(serviceId, service.name(), duration, technicians);
    }

    private List<SupplyInterval> fetchSupply(Instant start, Instant end) {
        LocalDate from = start.atZone(scheduleZoneId).toLocalDate();
        LocalDate to = end.minusNanos(1).atZone(scheduleZoneId).toLocalDate();
        List<StaffScheduleContract> schedules;
        try {
            schedules = unwrap(integrationCallRetrier.execute(
                            "staff-service",
                            () -> staffScheduleClient.getGarageSchedule(from.toString(), to.toString())),
                    "staff-service");
        } catch (FeignException exception) {
            throw integrationFailure("staff-service", exception);
        }

        List<SupplyInterval> supply = new ArrayList<>();
        for (StaffScheduleContract schedule : schedules) {
            if (schedule == null || schedule.staffId() == null) {
                throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                        "staff-service trả lịch thiếu mã nhân viên");
            }
            if (schedule.days() == null) {
                continue;
            }
            for (StaffScheduleContract.Day day : schedule.days()) {
                if (day == null || day.intervals() == null) {
                    continue;
                }
                for (StaffScheduleContract.Interval interval : day.intervals()) {
                    if (interval == null || interval.startAt() == null || interval.endAt() == null
                            || !interval.startAt().isBefore(interval.endAt())) {
                        throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                                "staff-service trả khoảng làm việc không hợp lệ");
                    }
                    supply.add(new SupplyInterval(schedule.staffId(), interval.startAt(), interval.endAt()));
                }
            }
        }
        return supply;
    }

    private List<DemandInterval> loadExistingDemand(Instant start, Instant end) {
        return loadExistingDemand(start, end, null);
    }

    private List<DemandInterval> loadExistingDemand(Instant start, Instant end, UUID excludedBookingId) {
        List<Booking> bookings = excludedBookingId == null
                ? bookingRepository.findCapacityBookingsOverlapping(
                        start, end, BookingStatus.capacityHoldingStatuses())
                : bookingRepository.findCapacityBookingsOverlappingExcluding(
                    start, end, BookingStatus.capacityHoldingStatuses(), excludedBookingId);
        if (bookings.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = bookings.stream().map(Booking::getId).distinct().toList();
        List<BookingService> lines = bookingServiceRepository.findAllByBookingIds(ids);
        return ExistingDemandReconstructor.reconstruct(bookings, lines);
    }

    private <T> T unwrap(ApiResponse<T> response, String serviceName) {
        if (response == null || response.code() != 0 || response.result() == null) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    serviceName + " trả phản hồi không hợp lệ");
        }
        return response.result();
    }

    private ApiException integrationFailure(String serviceName, FeignException exception) {
        // Không được coi lỗi phụ thuộc là "nguồn cung bằng 0" (PLAN §5.10).
        log.error("Gọi {} thất bại (HTTP {}): {}", serviceName, exception.status(), exception.getMessage());
        return new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                "Không thể lấy dữ liệu từ " + serviceName + ", vui lòng thử lại sau");
    }
}

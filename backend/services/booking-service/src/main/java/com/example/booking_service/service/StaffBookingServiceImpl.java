package com.example.booking_service.service;

import com.example.booking_service.capacity.BookingRescheduleContext;
import com.example.booking_service.capacity.DemandInterval;
import com.example.booking_service.capacity.SequentialDemandBuilder;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.capacity.SupplyInterval;
import com.example.booking_service.common.ServiceSelectionValidator;
import com.example.booking_service.dto.request.BookingCreateRequest;
import com.example.booking_service.dto.request.StaffBookingCreateRequest;
import com.example.booking_service.dto.response.BookingResponse;
import com.example.booking_service.dto.response.StaffBookingPageResponse;
import com.example.booking_service.dto.response.StaffBookingResponse;
import com.example.booking_service.enums.BookingSource;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import com.example.booking_service.integration.customer.CustomerDirectory;
import com.example.booking_service.integration.customer.VehicleContract;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffBookingServiceImpl implements StaffBookingService {

    /** Khách walk-in đang đứng tại quầy: cho phép giờ bắt đầu lùi nhẹ so với hiện tại. */
    private static final Duration WALK_IN_START_TOLERANCE = Duration.ofMinutes(15);

    private final CapacityCheckService capacityCheckService;
    private final BookingTransactionService bookingTransactionService;
    private final StaffBookingTransactionService staffTransactionService;
    private final CustomerDirectory customerDirectory;
    private final ZoneId scheduleZoneId;

    @Override
    public StaffBookingResponse create(StaffBookingCreateRequest request, Jwt jwt) {
        UUID staffUserId = staffUserId(jwt);
        validateSourceAndStart(request);
        ServiceSelectionValidator.validateUnique(request.serviceIds());

        UUID customerId = customerDirectory.requireActiveCustomer(request.customerId());
        List<ServiceSlot> serviceSlots = capacityCheckService.resolveServiceSlots(request.serviceIds());
        List<DemandInterval> demand = SequentialDemandBuilder.build(request.startAt(), serviceSlots);
        Instant endAt = demand.get(demand.size() - 1).end();
        List<SupplyInterval> supply = capacityCheckService.prepareSupply(request.startAt(), endAt);

        BookingCreateRequest bookingRequest = new BookingCreateRequest(
                request.startAt(), request.serviceIds(), request.licensePlate(), request.customerNote());
        BookingResponse created = bookingTransactionService.create(bookingRequest, customerId, staffUserId,
                serviceSlots, supply, request.source(), staffUserId, "STAFF_BOOKING_CREATED_" + request.source());
        return staffTransactionService.get(created.id());
    }

    @Override
    public StaffBookingPageResponse search(
            BookingStatus status, BookingSource source, UUID customerId, String licensePlate,
            LocalDate from, LocalDate to, int page, int size, boolean newestFirst
    ) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "to phải sau hoặc bằng from");
        }
        Instant fromInstant = from == null ? null : from.atStartOfDay(scheduleZoneId).toInstant();
        Instant toExclusive = to == null ? null : to.plusDays(1).atStartOfDay(scheduleZoneId).toInstant();
        return staffTransactionService.search(status, source, customerId, licensePlate,
                fromInstant, toExclusive, page, size, newestFirst);
    }

    @Override
    public StaffBookingResponse get(UUID bookingId) {
        return staffTransactionService.get(bookingId);
    }

    @Override
    public StaffBookingResponse cancel(UUID bookingId, String reason, Jwt jwt) {
        bookingTransactionService.cancelByStaff(staffUserId(jwt), bookingId, reason);
        return staffTransactionService.get(bookingId);
    }

    @Override
    public StaffBookingResponse reschedule(UUID bookingId, Instant startAt, Jwt jwt) {
        staffUserId(jwt);
        if (startAt == null || !startAt.isAfter(Instant.now())) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_TIME,
                    "Thời điểm bắt đầu mới phải nằm trong tương lai");
        }
        BookingRescheduleContext context = bookingTransactionService.findRescheduleContextForStaff(bookingId);
        List<SupplyInterval> supply = List.of();
        if (!startAt.equals(context.currentStartAt())) {
            List<DemandInterval> demand = SequentialDemandBuilder.build(startAt, context.services());
            supply = capacityCheckService.prepareSupply(startAt, demand.get(demand.size() - 1).end());
        }
        bookingTransactionService.rescheduleByStaff(bookingId, startAt, context.services(), supply);
        return staffTransactionService.get(bookingId);
    }

    @Override
    public StaffBookingResponse linkVehicle(UUID bookingId, UUID vehicleId) {
        staffTransactionService.get(bookingId);
        VehicleContract vehicle = customerDirectory.requireActiveVehicle(vehicleId);
        return staffTransactionService.linkVehicle(bookingId, vehicleId, vehicle.licensePlate());
    }

    @Override
    public StaffBookingResponse checkIn(UUID bookingId, UUID vehicleId, Jwt jwt) {
        UUID staffUserId = staffUserId(jwt);
        if (vehicleId != null) {
            linkVehicle(bookingId, vehicleId);
        }
        return staffTransactionService.checkIn(bookingId, staffUserId);
    }

    @Override
    public StaffBookingResponse updateStatus(UUID bookingId, BookingStatus status, String reason, Jwt jwt) {
        return staffTransactionService.updateStatus(bookingId, status, reason, staffUserId(jwt));
    }

    private void validateSourceAndStart(StaffBookingCreateRequest request) {
        if (request.source() == BookingSource.ONLINE) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Nhân viên chỉ tạo lịch hẹn kênh PHONE hoặc WALK_IN");
        }
        Instant earliest = request.source() == BookingSource.WALK_IN
                ? Instant.now().minus(WALK_IN_START_TOLERANCE)
                : Instant.now();
        if (request.startAt() == null || !request.startAt().isAfter(earliest)) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_TIME,
                    request.source() == BookingSource.WALK_IN
                            ? "Giờ bắt đầu walk-in không được sớm hơn 15 phút so với hiện tại"
                            : "Thời điểm bắt đầu phải nằm trong tương lai");
        }
    }

    private UUID staffUserId(Jwt jwt) {
        if (jwt == null) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        try {
            return UUID.fromString(jwt.getClaimAsString("userId"));
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Token không có userId hợp lệ");
        }
    }
}

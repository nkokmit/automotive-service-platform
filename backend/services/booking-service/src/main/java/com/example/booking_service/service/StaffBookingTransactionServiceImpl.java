package com.example.booking_service.service;

import com.example.booking_service.dto.response.StaffBookingPageResponse;
import com.example.booking_service.dto.response.StaffBookingResponse;
import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingService;
import com.example.booking_service.enums.BookingSource;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import com.example.booking_service.integration.customer.CustomerDirectory;
import com.example.booking_service.messaging.VehicleCheckedInDomainEvent;
import com.example.booking_service.mapper.BookingMapper;
import com.example.booking_service.repository.BookingRepository;
import com.example.booking_service.repository.BookingServiceRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffBookingTransactionServiceImpl implements StaffBookingTransactionService {

    private static final int MAX_PAGE_SIZE = 100;

    private final BookingRepository bookingRepository;
    private final BookingServiceRepository bookingServiceRepository;
    private final BookingStatusHistoryService bookingStatusHistoryService;
    private final ZoneId scheduleZoneId;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(readOnly = true)
    public StaffBookingPageResponse search(
            BookingStatus status,
            BookingSource source,
            UUID customerId,
            String licensePlate,
            Instant from,
            Instant toExclusive,
            int page,
            int size,
            boolean newestFirst
    ) {
        if (page < 0 || size < 1) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "page phải >= 0 và size phải >= 1");
        }
        Specification<Booking> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (source != null) {
                predicates.add(cb.equal(root.get("source"), source));
            }
            if (customerId != null) {
                predicates.add(cb.equal(root.get("customerId"), customerId));
            }
            if (licensePlate != null && !licensePlate.isBlank()) {
                predicates.add(cb.like(cb.upper(root.get("licensePlateSnapshot")),
                        "%" + licensePlate.strip().toUpperCase() + "%"));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("startAt"), from));
            }
            if (toExclusive != null) {
                predicates.add(cb.lessThan(root.get("startAt"), toExclusive));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Sort sort = newestFirst ? Sort.by("startAt").descending() : Sort.by("startAt").ascending();
        Page<Booking> result = bookingRepository.findAll(spec,
                PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE), sort));
        return new StaffBookingPageResponse(toResponses(result.getContent()), result.getNumber(),
                result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Override
    @Transactional(readOnly = true)
    public StaffBookingResponse get(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(ErrorCode.BOOKING_NOT_FOUND));
        return toResponses(List.of(booking)).get(0);
    }

    private void linkVehicle(Booking booking, UUID vehicleId, String verifiedPlate) {
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_STATUS_TRANSITION,
                    "Chỉ liên kết xe cho lịch hẹn CONFIRMED hoặc CHECKED_IN");
        }
        if (!CustomerDirectory.normalizePlate(verifiedPlate)
                .equals(CustomerDirectory.normalizePlate(booking.getLicensePlateSnapshot()))) {
            throw new ApiException(ErrorCode.VEHICLE_PLATE_MISMATCH);
        }
        if (vehicleId.equals(booking.getVehicleId())) {
            return;
        }
        if (booking.getVehicleId() != null) {
            throw new ApiException(ErrorCode.VEHICLE_ALREADY_LINKED);
        }
        booking.setVehicleId(vehicleId);
    }

    @Override
    @Transactional
    public StaffBookingResponse checkIn(
            UUID bookingId,
            UUID vehicleId,
            String verifiedPlate,
            Integer odometerIn,
            String vehicleCondition,
            String customerNote,
            UUID staffUserId
    ) {
        Booking booking = lock(bookingId);
        if (booking.getStatus() == BookingStatus.CHECKED_IN) {
            if (vehicleId != null) {
                linkVehicle(booking, vehicleId, verifiedPlate);
            }
            publishVehicleCheckedInEvent(booking, odometerIn, vehicleCondition, customerNote, staffUserId);
            return respond(booking);
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_STATUS_TRANSITION,
                    "Chỉ tiếp nhận lịch hẹn CONFIRMED");
        }
        if (!booking.getStartAt().atZone(scheduleZoneId).toLocalDate()
                .equals(Instant.now().atZone(scheduleZoneId).toLocalDate())) {
            throw new ApiException(ErrorCode.CHECK_IN_REQUIREMENTS_NOT_MET,
                    "Chỉ tiếp nhận trong ngày hẹn");
        }
        if (vehicleId != null) {
            linkVehicle(booking, vehicleId, verifiedPlate);
        }
        if (booking.getVehicleId() == null) {
            throw new ApiException(ErrorCode.CHECK_IN_REQUIREMENTS_NOT_MET,
                    "Cần xác minh và liên kết xe chính thức trước khi tiếp nhận");
        }
        booking.setCheckedInAt(Instant.now());
        bookingStatusHistoryService.recordTransition(
                booking, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, staffUserId, "STAFF_CHECK_IN");
        bookingRepository.saveAndFlush(booking);
        publishVehicleCheckedInEvent(booking, odometerIn, vehicleCondition, customerNote, staffUserId);
        return respond(booking);
    }

    private void publishVehicleCheckedInEvent(
            Booking booking,
            Integer odometerIn,
            String vehicleCondition,
            String customerNote,
            UUID advisorId
    ) {
        eventPublisher.publishEvent(new VehicleCheckedInDomainEvent(
                UUID.randomUUID(),
                booking.getId(),
                booking.getCustomerId(),
                booking.getVehicleId(),
                advisorId,
                odometerIn,
                vehicleCondition,
                customerNote,
                Instant.now()));
    }

    /** Chỉ cho phép NO_SHOW (CONFIRMED, đã quá giờ hẹn) và FULFILLED (CHECKED_IN). */
    @Override
    @Transactional
    public StaffBookingResponse updateStatus(UUID bookingId, BookingStatus target, String reason, UUID staffUserId) {
        Booking booking = lock(bookingId);
        BookingStatus current = booking.getStatus();
        if (current == target) {
            return respond(booking);
        }
        switch (target) {
            case NO_SHOW -> {
                if (current != BookingStatus.CONFIRMED || booking.getCheckedInAt() != null
                        || booking.getWorkOrderId() != null) {
                    throw invalid(current, target);
                }
                if (booking.getStartAt().isAfter(Instant.now())) {
                    throw new ApiException(ErrorCode.INVALID_BOOKING_STATUS_TRANSITION,
                            "Chỉ ghi nhận no-show sau thời điểm hẹn");
                }
            }
            case FULFILLED -> {
                if (current != BookingStatus.CHECKED_IN) {
                    throw invalid(current, target);
                }
            }
            case CANCELLED -> throw new ApiException(ErrorCode.INVALID_BOOKING_STATUS_TRANSITION,
                    "Dùng endpoint hủy lịch hẹn để chuyển sang CANCELLED");
            default -> throw new ApiException(ErrorCode.INVALID_BOOKING_STATUS_TRANSITION,
                    "Trạng thái " + target + " không được đặt trực tiếp; dùng endpoint tiếp nhận/đặt lịch tương ứng");
        }
        String normalizedReason = reason == null || reason.isBlank() ? "STAFF_" + target : reason.strip();
        bookingStatusHistoryService.recordTransition(booking, current, target, staffUserId, normalizedReason);
        bookingRepository.saveAndFlush(booking);
        return respond(booking);
    }

    private ApiException invalid(BookingStatus from, BookingStatus to) {
        return new ApiException(ErrorCode.INVALID_BOOKING_STATUS_TRANSITION,
                "Không thể chuyển từ " + from + " sang " + to);
    }

    private Booking lock(UUID bookingId) {
        return bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ApiException(ErrorCode.BOOKING_NOT_FOUND));
    }

    private StaffBookingResponse respond(Booking booking) {
        return toResponses(List.of(booking)).get(0);
    }

    private List<StaffBookingResponse> toResponses(List<Booking> bookings) {
        if (bookings.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = bookings.stream().map(Booking::getId).toList();
        Map<UUID, List<BookingService>> lines = bookingServiceRepository.findAllByBookingIds(ids).stream()
                .collect(Collectors.groupingBy(line -> line.getBooking().getId()));
        return bookings.stream()
                .map(b -> BookingMapper.toStaffResponse(b, lines.getOrDefault(b.getId(), List.of())))
                .toList();
    }
}

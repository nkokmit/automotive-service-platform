package com.example.booking_service.service;

import com.example.booking_service.capacity.BookingRescheduleContext;
import com.example.booking_service.capacity.CapacityCheckResult;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.capacity.SupplyInterval;
import com.example.booking_service.dto.request.BookingCreateRequest;
import com.example.booking_service.dto.response.BookingResponse;
import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingService;
import com.example.booking_service.enums.BookingSource;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import com.example.booking_service.mapper.BookingMapper;
import com.example.booking_service.repository.BookingRepository;
import com.example.booking_service.repository.BookingServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingTransactionServiceImpl implements BookingTransactionService {

    private final BookingRepository bookingRepository;
    private final BookingServiceRepository bookingServiceRepository;
    private final CapacityCheckService capacityCheckService;
    private final BookingStatusHistoryService bookingStatusHistoryService;
    private final ZoneId scheduleZoneId;

    @Override
    @Transactional
    public BookingResponse create(
            BookingCreateRequest request,
            UUID customerId,
            UUID changedBy,
            List<ServiceSlot> serviceSlots,
            List<SupplyInterval> supply
    ) {
        return create(request, customerId, changedBy, serviceSlots, supply,
                BookingSource.ONLINE, null, "CUSTOMER_BOOKING_CREATED");
    }

    @Override
    @Transactional
    public BookingResponse create(
            BookingCreateRequest request,
            UUID customerId,
            UUID changedBy,
            List<ServiceSlot> serviceSlots,
            List<SupplyInterval> supply,
            BookingSource source,
            UUID createdBy,
            String initialReason
    ) {
        // Bookings do not span midnight, so locking the start date serializes all overlapping bookings.
        LocalDate lockDate = request.startAt().atZone(scheduleZoneId).toLocalDate();
        bookingRepository.insertCapacityDayLockIfAbsent(lockDate);
        if (bookingRepository.lockCapacityDay(lockDate) == null) {
            throw new IllegalStateException("Booking capacity day lock row is missing");
        }

        CapacityCheckResult capacity = capacityCheckService.check(request.startAt(), serviceSlots, supply);
        if (!capacity.feasible()) {
            throw new ApiException(ErrorCode.INSUFFICIENT_TECHNICIAN_CAPACITY,
                    "Khung giờ không còn đủ sức chứa; vui lòng chọn thời gian khác");
        }

        Booking booking = Booking.builder()
                .customerId(customerId)
                .licensePlateSnapshot(request.licensePlate().strip())
                .startAt(capacity.requestStart())
                .endAt(capacity.requestEnd())
                .status(BookingStatus.CONFIRMED)
                .source(source)
                .createdBy(createdBy)
                .customerNote(normalizeNote(request.customerNote()))
                .build();
        Booking saved = bookingRepository.save(booking);

        List<BookingService> serviceEntities = new ArrayList<>(serviceSlots.size());
        for (int i = 0; i < serviceSlots.size(); i++) {
            ServiceSlot slot = serviceSlots.get(i);
            serviceEntities.add(BookingService.builder()
                    .booking(saved)
                    .serviceId(slot.serviceId())
                    .serviceNameSnapshot(slot.serviceName())
                    .estimatedDurationMinutes(slot.durationMinutes())
                    .requiredTechniciansSnapshot(slot.requiredTechnicians())
                    .sequenceNumber(i + 1)
                    .build());
        }
        bookingServiceRepository.saveAll(serviceEntities);
        bookingStatusHistoryService.recordInitialStatus(saved, changedBy, initialReason);

        return BookingMapper.toResponse(saved, serviceEntities);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> findMine(UUID customerId) {
        List<Booking> bookings = bookingRepository.findByCustomerIdOrderByStartAtDesc(customerId);
        if (bookings.isEmpty()) {
            return List.of();
        }

        List<UUID> bookingIds = bookings.stream().map(Booking::getId).toList();
        Map<UUID, List<BookingService>> servicesByBooking = bookingServiceRepository
                .findAllByBookingIds(bookingIds).stream()
                .collect(Collectors.groupingBy(line -> line.getBooking().getId()));
        return bookings.stream()
                .map(booking -> BookingMapper.toResponse(booking,
                        servicesByBooking.getOrDefault(booking.getId(), List.of())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse findMine(UUID customerId, UUID bookingId) {
        Booking booking = findOwnedBooking(customerId, bookingId);
        return responseFor(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingRescheduleContext findRescheduleContext(UUID customerId, UUID bookingId) {
        return rescheduleContextOf(findOwnedBooking(customerId, bookingId));
    }

    @Override
    @Transactional(readOnly = true)
    public BookingRescheduleContext findRescheduleContextForStaff(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(ErrorCode.BOOKING_NOT_FOUND));
        return rescheduleContextOf(booking);
    }

    @Override
    @Transactional
    public BookingResponse cancel(UUID customerId, UUID changedBy, UUID bookingId, String reason) {
        return cancelLocked(lockOwnedBooking(customerId, bookingId), changedBy,
                normalizeReason(reason, "CUSTOMER_BOOKING_CANCELLED"));
    }

    @Override
    @Transactional
    public BookingResponse cancelByStaff(UUID staffUserId, UUID bookingId, String reason) {
        return cancelLocked(lockBooking(bookingId), staffUserId, normalizeReason(reason, "STAFF_BOOKING_CANCELLED"));
    }

    @Override
    @Transactional
    public BookingResponse reschedule(
            UUID customerId,
            UUID bookingId,
            Instant requestedStartAt,
            List<ServiceSlot> services,
            List<SupplyInterval> supply
    ) {
        return rescheduleLocked(lockOwnedBooking(customerId, bookingId), requestedStartAt, services, supply);
    }

    @Override
    @Transactional
    public BookingResponse rescheduleByStaff(
            UUID bookingId,
            Instant requestedStartAt,
            List<ServiceSlot> services,
            List<SupplyInterval> supply
    ) {
        return rescheduleLocked(lockBooking(bookingId), requestedStartAt, services, supply);
    }

    private BookingRescheduleContext rescheduleContextOf(Booking booking) {
        UUID bookingId = booking.getId();
        requireConfirmedAndUpcoming(booking);
        List<ServiceSlot> services = bookingServiceRepository
                .findByBookingIdOrderBySequenceNumberAsc(bookingId).stream()
                .map(BookingMapper::toServiceSlot)
                .toList();
        if (services.isEmpty()) {
            throw new IllegalStateException("Booking " + bookingId + " không có dòng dịch vụ nào");
        }
        return new BookingRescheduleContext(booking.getStartAt(), services);
    }

    private BookingResponse cancelLocked(Booking booking, UUID changedBy, String reason) {
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return responseFor(booking);
        }
        requireConfirmedAndUpcoming(booking);
        lockCapacityDates(booking.getStartAt(), booking.getStartAt());

        BookingStatus previousStatus = booking.getStatus();
        booking.setCancelledAt(Instant.now());
        bookingStatusHistoryService.recordTransition(
                booking, previousStatus, BookingStatus.CANCELLED, changedBy, reason);
        bookingRepository.saveAndFlush(booking);
        return responseFor(booking);
    }

    private BookingResponse rescheduleLocked(
            Booking booking,
            Instant requestedStartAt,
            List<ServiceSlot> services,
            List<SupplyInterval> supply
    ) {
        UUID bookingId = booking.getId();
        requireConfirmedAndUpcoming(booking);
        if (!requestedStartAt.isAfter(Instant.now())) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_TIME,
                    "Thời điểm bắt đầu mới phải nằm trong tương lai");
        }
        if (requestedStartAt.equals(booking.getStartAt())) {
            return responseFor(booking);
        }

        lockCapacityDates(booking.getStartAt(), requestedStartAt);
        CapacityCheckResult capacity = capacityCheckService.check(
                requestedStartAt, services, supply, bookingId);
        if (!capacity.feasible()) {
            throw new ApiException(ErrorCode.INSUFFICIENT_TECHNICIAN_CAPACITY,
                    "Khung giờ mới không còn đủ sức chứa; lịch hiện tại vẫn được giữ nguyên");
        }

        booking.setStartAt(capacity.requestStart());
        booking.setEndAt(capacity.requestEnd());
        bookingRepository.saveAndFlush(booking);
        return responseFor(booking);
    }

    private void lockCapacityDates(Instant currentStartAt, Instant requestedStartAt) {
        List<LocalDate> dates = new ArrayList<>(List.of(
                currentStartAt.atZone(scheduleZoneId).toLocalDate(),
                requestedStartAt.atZone(scheduleZoneId).toLocalDate()));
        // All reschedules acquire multiple day locks in the same order to avoid deadlocks.
        dates = dates.stream().distinct().sorted(Comparator.naturalOrder()).toList();
        for (LocalDate date : dates) {
            bookingRepository.insertCapacityDayLockIfAbsent(date);
            if (bookingRepository.lockCapacityDay(date) == null) {
                throw new IllegalStateException("Booking capacity day lock row is missing: " + date);
            }
        }
    }

    private Booking findOwnedBooking(UUID customerId, UUID bookingId) {
        return bookingRepository.findByIdAndCustomerId(bookingId, customerId)
                .orElseThrow(() -> new ApiException(ErrorCode.BOOKING_NOT_FOUND));
    }

    private Booking lockBooking(UUID bookingId) {
        return bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ApiException(ErrorCode.BOOKING_NOT_FOUND));
    }

    private Booking lockOwnedBooking(UUID customerId, UUID bookingId) {
        return bookingRepository.findByIdAndCustomerIdForUpdate(bookingId, customerId)
                .orElseThrow(() -> new ApiException(ErrorCode.BOOKING_NOT_FOUND));
    }

    private void requireConfirmedAndUpcoming(Booking booking) {
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_STATUS_TRANSITION,
                    "Chỉ lịch hẹn CONFIRMED mới có thể hủy hoặc đổi lịch");
        }
        if (!booking.getStartAt().isAfter(Instant.now())) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_STATUS_TRANSITION,
                    "Không thể hủy hoặc đổi lịch sau thời điểm hẹn; cần xử lý theo quy trình no-show/tiếp nhận");
        }
        if (booking.getWorkOrderId() != null || booking.getCheckedInAt() != null) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_STATUS_TRANSITION,
                    "Lịch hẹn đã bắt đầu quy trình tiếp nhận");
        }
    }

    private BookingResponse responseFor(Booking booking) {
        return BookingMapper.toResponse(booking,
                bookingServiceRepository.findByBookingIdOrderBySequenceNumberAsc(booking.getId()));
    }

    private String normalizeReason(String reason, String defaultReason) {
        if (reason == null || reason.isBlank()) {
            return defaultReason;
        }
        return reason.strip();
    }

    private String normalizeNote(String customerNote) {
        if (customerNote == null) {
            return null;
        }
        String normalized = customerNote.strip();
        return normalized.isEmpty() ? null : normalized;
    }
}

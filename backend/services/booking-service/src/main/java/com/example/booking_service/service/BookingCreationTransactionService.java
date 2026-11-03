package com.example.booking_service.service;

import com.example.booking_service.capacity.CapacityCheckResult;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.capacity.SupplyInterval;
import com.example.booking_service.dto.request.BookingCreateRequest;
import com.example.booking_service.dto.response.BookingResponse;
import com.example.booking_service.dto.response.BookingServiceResponse;
import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingService;
import com.example.booking_service.enums.BookingSource;
import com.example.booking_service.enums.BookingStatus;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import com.example.booking_service.repository.BookingRepository;
import com.example.booking_service.repository.BookingServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingCreationTransactionService {

    private final BookingRepository bookingRepository;
    private final BookingServiceRepository bookingServiceRepository;
    private final CapacityCheckService capacityCheckService;
    private final BookingStatusHistoryService bookingStatusHistoryService;
    private final ZoneId scheduleZoneId;

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
        List<BookingServiceResponse> serviceResponses = new ArrayList<>(serviceSlots.size());
        for (int i = 0; i < serviceSlots.size(); i++) {
            ServiceSlot slot = serviceSlots.get(i);
            int sequenceNumber = i + 1;
            serviceEntities.add(BookingService.builder()
                    .booking(saved)
                    .serviceId(slot.serviceId())
                    .serviceNameSnapshot(slot.serviceName())
                    .estimatedDurationMinutes(slot.durationMinutes())
                    .requiredTechniciansSnapshot(slot.requiredTechnicians())
                    .sequenceNumber(sequenceNumber)
                    .build());
            serviceResponses.add(new BookingServiceResponse(
                    slot.serviceId(), slot.serviceName(), slot.durationMinutes(),
                    slot.requiredTechnicians(), sequenceNumber));
        }
        bookingServiceRepository.saveAll(serviceEntities);
        bookingStatusHistoryService.recordInitialStatus(saved, changedBy, initialReason);

        return new BookingResponse(
                saved.getId(),
                saved.getCustomerId(),
                saved.getVehicleId(),
                saved.getLicensePlateSnapshot(),
                saved.getStartAt(),
                saved.getEndAt(),
                saved.getStatus(),
                saved.getCustomerNote(),
                serviceResponses,
                saved.getCreatedAt(),
                saved.getUpdatedAt()
        );
    }

    private String normalizeNote(String customerNote) {
        if (customerNote == null) {
            return null;
        }
        String normalized = customerNote.strip();
        return normalized.isEmpty() ? null : normalized;
    }
}

package com.example.booking_service.service;

import com.example.booking_service.capacity.DemandInterval;
import com.example.booking_service.capacity.SequentialDemandBuilder;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.capacity.SupplyInterval;
import com.example.booking_service.dto.response.BookingResponse;
import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;
import com.example.booking_service.integration.CurrentCustomerIdentity;
import com.example.booking_service.integration.CurrentCustomerIdentityResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingManagementService {

    private final CurrentCustomerIdentityResolver identityResolver;
    private final BookingManagementTransactionService transactionService;
    private final CapacityCheckService capacityCheckService;

    public List<BookingResponse> findMine(Jwt jwt) {
        CurrentCustomerIdentity identity = identityResolver.resolve(jwt);
        return transactionService.findMine(identity.customerId());
    }

    public BookingResponse findMine(UUID bookingId, Jwt jwt) {
        CurrentCustomerIdentity identity = identityResolver.resolve(jwt);
        return transactionService.findMine(identity.customerId(), bookingId);
    }

    public BookingResponse cancel(UUID bookingId, String reason, Jwt jwt) {
        CurrentCustomerIdentity identity = identityResolver.resolve(jwt);
        return transactionService.cancel(identity.customerId(), identity.userId(), bookingId, reason);
    }

    public BookingResponse reschedule(UUID bookingId, Instant startAt, Jwt jwt) {
        if (startAt == null || !startAt.isAfter(Instant.now())) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_TIME,
                    "Thời điểm bắt đầu mới phải nằm trong tương lai");
        }
        CurrentCustomerIdentity identity = identityResolver.resolve(jwt);
        BookingRescheduleContext context = transactionService
                .findRescheduleContext(identity.customerId(), bookingId);
        if (startAt.equals(context.currentStartAt())) {
            return transactionService.reschedule(identity.customerId(), bookingId,
                    startAt, context.services(), List.of());
        }

        List<DemandInterval> demand = SequentialDemandBuilder.build(startAt, context.services());
        Instant endAt = demand.get(demand.size() - 1).end();
        List<SupplyInterval> supply = capacityCheckService.prepareSupply(startAt, endAt);
        return transactionService.reschedule(identity.customerId(), bookingId,
                startAt, context.services(), supply);
    }
}

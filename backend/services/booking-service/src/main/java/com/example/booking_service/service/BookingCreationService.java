package com.example.booking_service.service;

import com.example.booking_service.capacity.DemandInterval;
import com.example.booking_service.capacity.SequentialDemandBuilder;
import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.capacity.SupplyInterval;
import com.example.booking_service.dto.request.BookingCreateRequest;
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
public class BookingCreationService {

    private final CapacityCheckService capacityCheckService;
    private final BookingCreationTransactionService transactionService;
    private final CurrentCustomerIdentityResolver identityResolver;

    public BookingResponse create(BookingCreateRequest request, Jwt jwt) {
        if (request.startAt() == null || !request.startAt().isAfter(Instant.now())) {
            throw new ApiException(ErrorCode.INVALID_BOOKING_TIME,
                    "Thời điểm bắt đầu phải nằm trong tương lai");
        }
        ServiceSelectionValidator.validateUnique(request.serviceIds());

        CurrentCustomerIdentity identity = identityResolver.resolve(jwt);
        List<ServiceSlot> serviceSlots = capacityCheckService.resolveServiceSlots(request.serviceIds());
        List<DemandInterval> demand = SequentialDemandBuilder.build(request.startAt(), serviceSlots);
        Instant endAt = demand.get(demand.size() - 1).end();
        List<SupplyInterval> supply = capacityCheckService.prepareSupply(request.startAt(), endAt);

        return transactionService.create(request, identity.customerId(), identity.userId(), serviceSlots, supply);
    }
}

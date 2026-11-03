package com.example.booking_service.service;

import com.example.booking_service.capacity.ServiceSlot;
import com.example.booking_service.capacity.SupplyInterval;
import com.example.booking_service.dto.request.BookingCreateRequest;
import com.example.booking_service.dto.response.BookingResponse;
import com.example.booking_service.integration.CurrentCustomerIdentity;
import com.example.booking_service.integration.CurrentCustomerIdentityResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingCreationServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID CUSTOMER_ID = UUID.randomUUID();
    private static final UUID SERVICE_ID = UUID.randomUUID();

    @Mock
    private CapacityCheckService capacityCheckService;
    @Mock
    private BookingCreationTransactionService transactionService;
    @Mock
    private CurrentCustomerIdentityResolver identityResolver;
    @Mock
    private Jwt jwt;

    private BookingCreationService service;

    @BeforeEach
    void setUp() {
        service = new BookingCreationService(
                capacityCheckService, transactionService, identityResolver);
    }

    @Test
    void resolvesCustomerProfileAndUsesOrderedServiceSnapshots() {
        Instant start = Instant.now().plusSeconds(3600);
        BookingCreateRequest request = new BookingCreateRequest(start, List.of(SERVICE_ID), "  51A-12345  ", null);
        List<ServiceSlot> serviceSlots = List.of(new ServiceSlot(SERVICE_ID, "Oil change", 30, 1));
        List<SupplyInterval> supply = List.of(
                new SupplyInterval(UUID.randomUUID(), start, start.plusSeconds(3600)));
        BookingResponse expected = new BookingResponse(
                UUID.randomUUID(), CUSTOMER_ID, null, "51A-12345", start, start.plusSeconds(1800),
                com.example.booking_service.enums.BookingStatus.CONFIRMED, null, List.of(), start, start);
        when(identityResolver.resolve(jwt)).thenReturn(new CurrentCustomerIdentity(USER_ID, CUSTOMER_ID));
        when(capacityCheckService.resolveServiceSlots(List.of(SERVICE_ID))).thenReturn(serviceSlots);
        when(capacityCheckService.prepareSupply(start, start.plusSeconds(1800))).thenReturn(supply);
        when(transactionService.create(request, CUSTOMER_ID, USER_ID, serviceSlots, supply)).thenReturn(expected);

        BookingResponse response = service.create(request, jwt);

        assertEquals(expected, response);
        verify(identityResolver).resolve(jwt);
        verify(transactionService).create(request, CUSTOMER_ID, USER_ID, serviceSlots, supply);
    }
}

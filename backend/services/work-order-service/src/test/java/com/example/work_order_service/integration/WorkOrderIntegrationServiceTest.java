package com.example.work_order_service.integration;

import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.client.BookingClient;
import com.example.work_order_service.integration.client.CustomerVehicleClient;
import com.example.work_order_service.integration.client.InventoryServiceClient;
import com.example.work_order_service.integration.contract.BookingContract;
import com.example.work_order_service.integration.contract.CustomerContract;
import com.example.work_order_service.integration.contract.InternalServiceBomContract;
import com.example.work_order_service.integration.contract.InternalServiceCatalogContract;
import com.example.work_order_service.integration.contract.ServiceApiResponse;
import com.example.work_order_service.integration.contract.VehicleContract;
import feign.FeignException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderIntegrationServiceTest {

    private final UUID bookingId = UUID.randomUUID();
    private final UUID customerId = UUID.randomUUID();
    private final UUID vehicleId = UUID.randomUUID();

    @Mock
    private BookingClient bookingClient;
    @Mock
    private CustomerVehicleClient customerVehicleClient;
    @Mock
    private InventoryServiceClient inventoryServiceClient;

    private WorkOrderIntegrationService integrationService;

    @BeforeEach
    void setUp() {
        integrationService = new WorkOrderIntegrationService(
                bookingClient, customerVehicleClient, inventoryServiceClient);
    }

    @Test
    void loadsActiveServiceAndBomForEstimateSnapshot() {
        UUID serviceId = UUID.randomUUID();
        UUID partId = UUID.randomUUID();
        when(inventoryServiceClient.getService(serviceId)).thenReturn(new ServiceApiResponse<>(0, "Success",
                new InternalServiceCatalogContract(serviceId, "Oil change", 30, 1,
                        BigDecimal.valueOf(500), true)));
        when(inventoryServiceClient.getServiceBom(serviceId)).thenReturn(new ServiceApiResponse<>(0, "Success",
                List.of(new InternalServiceBomContract(partId, "OIL-1", "Engine oil", "L", 2,
                        BigDecimal.valueOf(100), true))));

        var catalog = integrationService.getServiceEstimateCatalog(serviceId);

        assertEquals(serviceId, catalog.service().id());
        assertEquals(partId, catalog.bom().get(0).partId());
        assertEquals(2, catalog.bom().get(0).defaultQuantity());
    }

    @Test
    void rejectsInactiveServiceFromInventoryCatalog() {
        UUID serviceId = UUID.randomUUID();
        when(inventoryServiceClient.getService(serviceId)).thenReturn(new ServiceApiResponse<>(0, "Success",
                new InternalServiceCatalogContract(serviceId, "Oil change", 30, 1,
                        BigDecimal.valueOf(500), false)));
        when(inventoryServiceClient.getServiceBom(serviceId)).thenReturn(new ServiceApiResponse<>(0, "Success",
                List.of()));

        ApiException exception = assertThrows(ApiException.class,
                () -> integrationService.getServiceEstimateCatalog(serviceId));

        assertEquals(ErrorCode.SERVICE_NOT_ACTIVE, exception.getErrorCode());
    }

    @Test
    void acceptsCheckedInBookingWithActiveVehicle() {
        BookingContract booking = booking("CHECKED_IN");
        when(bookingClient.getBooking(bookingId)).thenReturn(new ServiceApiResponse<>(0, "Success", booking));
        when(customerVehicleClient.getCustomer(customerId))
                .thenReturn(new ServiceApiResponse<>(0, "Success", customer()));
        when(customerVehicleClient.getVehicle(vehicleId))
                .thenReturn(new ServiceApiResponse<>(0, "Success", vehicle(true)));

        assertSame(booking, integrationService.requireCheckedInBooking(bookingId).booking());
        verify(customerVehicleClient).getCustomer(customerId);
        verify(customerVehicleClient).getVehicle(vehicleId);
    }

    @Test
    void rejectsBookingThatIsNotCheckedIn() {
        BookingContract booking = booking("CONFIRMED");
        when(bookingClient.getBooking(bookingId)).thenReturn(new ServiceApiResponse<>(0, "Success", booking));

        ApiException exception = assertThrows(ApiException.class,
                () -> integrationService.requireCheckedInBooking(bookingId));

        assertEquals(ErrorCode.BOOKING_NOT_CHECKED_IN, exception.getErrorCode());
    }

    @Test
    void mapsMissingBookingToDomainError() {
        FeignException.NotFound notFound = mock(FeignException.NotFound.class);
        when(bookingClient.getBooking(bookingId)).thenThrow(notFound);

        ApiException exception = assertThrows(ApiException.class,
                () -> integrationService.requireCheckedInBooking(bookingId));

        assertEquals(ErrorCode.BOOKING_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    void rejectsInactiveVehicle() {
        BookingContract booking = booking("CHECKED_IN");
        when(bookingClient.getBooking(bookingId)).thenReturn(new ServiceApiResponse<>(0, "Success", booking));
        when(customerVehicleClient.getCustomer(customerId))
                .thenReturn(new ServiceApiResponse<>(0, "Success", customer()));
        when(customerVehicleClient.getVehicle(vehicleId))
                .thenReturn(new ServiceApiResponse<>(0, "Success", vehicle(false)));

        ApiException exception = assertThrows(ApiException.class,
                () -> integrationService.requireCheckedInBooking(bookingId));

        assertEquals(ErrorCode.VEHICLE_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    void loadsRelatedBookingCustomerAndVehicleForDetail() {
        BookingContract booking = booking("FULFILLED");
        when(bookingClient.getBooking(bookingId)).thenReturn(new ServiceApiResponse<>(0, "Success", booking));
        when(customerVehicleClient.getCustomer(customerId))
                .thenReturn(new ServiceApiResponse<>(0, "Success", customer()));
        when(customerVehicleClient.getVehicle(vehicleId))
                .thenReturn(new ServiceApiResponse<>(0, "Success", vehicle(true)));

        var details = integrationService.getDetailContext(com.example.work_order_service.entity.WorkOrder.builder()
                .bookingId(bookingId)
                .customerId(customerId)
                .vehicleId(vehicleId)
                .build());

        assertEquals(bookingId, details.booking().id());
        assertEquals(customerId, details.customer().id());
        assertEquals(vehicleId, details.vehicle().id());
    }

    @Test
    void requireBookingCheckedInAcceptsMatchingCheckedInBooking() {
        when(bookingClient.getBooking(bookingId))
                .thenReturn(new ServiceApiResponse<>(0, "Success", booking("CHECKED_IN")));

        integrationService.requireBookingCheckedIn(bookingId, customerId, vehicleId);
    }

    @Test
    void requireBookingCheckedInRejectsBookingStillConfirmed() {
        when(bookingClient.getBooking(bookingId))
                .thenReturn(new ServiceApiResponse<>(0, "Success", booking("CONFIRMED")));

        ApiException exception = assertThrows(ApiException.class,
                () -> integrationService.requireBookingCheckedIn(bookingId, customerId, vehicleId));

        assertEquals(ErrorCode.BOOKING_NOT_CHECKED_IN, exception.getErrorCode());
    }

    @Test
    void requireBookingCheckedInRejectsMismatchedVehicle() {
        when(bookingClient.getBooking(bookingId))
                .thenReturn(new ServiceApiResponse<>(0, "Success", booking("CHECKED_IN")));

        ApiException exception = assertThrows(ApiException.class,
                () -> integrationService.requireBookingCheckedIn(bookingId, customerId, UUID.randomUUID()));

        assertEquals(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE, exception.getErrorCode());
    }

    private BookingContract booking(String status) {
        return new BookingContract(
                bookingId, customerId, vehicleId, null, "51A-12345", null, null,
                status, "WALK_IN", null, null, List.of());
    }

    private VehicleContract vehicle(Boolean active) {
        return new VehicleContract(
                vehicleId, "51A-12345", null, "Maker", "Model", (short) 2024,
                null, null, null, null, 0, null, active);
    }

    private CustomerContract customer() {
        return new CustomerContract(customerId, "Customer", "0123", null, true);
    }
}

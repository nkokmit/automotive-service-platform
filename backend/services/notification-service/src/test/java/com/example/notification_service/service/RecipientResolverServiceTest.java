package com.example.notification_service.service;

import com.example.notification_service.enums.RecipientType;
import com.example.notification_service.exception.RecipientResolutionException;
import com.example.notification_service.integration.client.CustomerVehicleClient;
import com.example.notification_service.integration.client.StaffServiceClient;
import com.example.notification_service.integration.client.UserClient;
import com.example.notification_service.integration.contract.CustomerProfileResponse;
import com.example.notification_service.integration.contract.ServiceApiResponse;
import com.example.notification_service.integration.contract.StaffProfileResponse;
import com.example.notification_service.integration.contract.UserProfileResponse;
import com.example.notification_service.integration.contract.VehicleProfileResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

class RecipientResolverServiceTest {

    @Mock
    private CustomerVehicleClient customerVehicleClient;

    @Mock
    private StaffServiceClient staffServiceClient;

    @Mock
    private UserClient userClient;

    private RecipientResolverService resolver;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        resolver = new RecipientResolverService(customerVehicleClient, staffServiceClient, userClient);
    }

    @Test
    void resolvesCustomerProfileAndVehicleWithoutFetchingUserWhenContactIsComplete() {
        UUID customerId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();
        when(customerVehicleClient.getCustomer(customerId)).thenReturn(new ServiceApiResponse<>(
                0, "Success", new CustomerProfileResponse(
                        customerId, userId, "Customer", "0123", "customer@example.com", true)));
        when(customerVehicleClient.getVehicle(vehicleId)).thenReturn(new ServiceApiResponse<>(
                0, "Success", new VehicleProfileResponse(vehicleId, "51A-12345")));

        ResolvedRecipient result = resolver.resolve(RecipientType.CUSTOMER, customerId, vehicleId);

        assertEquals("customer@example.com", result.email());
        assertEquals("51A-12345", result.licensePlate());
        assertEquals("Customer", result.toTemplateVariables().get("customerName"));
        verify(userClient, never()).getUserById(userId);
    }

    @Test
    void fallsBackToUserProfileWhenStaffContactFieldsAreMissing() {
        UUID staffId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(staffServiceClient.getStaffById(staffId)).thenReturn(new ServiceApiResponse<>(
                0, "Success", new StaffProfileResponse(staffId, userId, "Staff", null, null, true)));
        when(userClient.getUserById(userId)).thenReturn(new ServiceApiResponse<>(
                0, "Success", new UserProfileResponse(userId, "staff@example.com", "0456", "User Name", true)));

        ResolvedRecipient result = resolver.resolve(RecipientType.STAFF, staffId);

        assertEquals("staff@example.com", result.email());
        assertEquals("0456", result.phone());
        assertEquals("Staff", result.fullName());
        assertEquals("Staff", result.toTemplateVariables().get("staffName"));
    }

    @Test
    void failsExplicitlyWhenProfileCannotBeResolved() {
        UUID customerId = UUID.randomUUID();
        when(customerVehicleClient.getCustomer(customerId)).thenReturn(new ServiceApiResponse<>(
                404, "Not found", null));

        assertThrows(RecipientResolutionException.class,
                () -> resolver.resolve(RecipientType.CUSTOMER, customerId));
    }
}

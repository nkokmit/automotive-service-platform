package com.example.work_order_service.integration;

import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.client.StaffServiceClient;
import com.example.work_order_service.integration.contract.ServiceApiResponse;
import com.example.work_order_service.integration.contract.StaffProfileContract;
import feign.FeignException;
import feign.Request;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StaffIntegrationServiceTest {

    @Mock
    private StaffServiceClient staffServiceClient;

    @Test
    void resolvesActiveStaffIdForAuthenticatedUser() {
        UUID userId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        when(staffServiceClient.getStaffByUserId(userId)).thenReturn(
                new ServiceApiResponse<>(0, "Success",
                        new StaffProfileContract(staffId, userId, true)));

        UUID result = new StaffIntegrationService(staffServiceClient).requireActiveStaffForUser(userId);

        assertEquals(staffId, result);
    }

    @Test
    void rejectsInactiveMechanicProfile() {
        UUID staffId = UUID.randomUUID();
        when(staffServiceClient.getStaffById(staffId)).thenReturn(
                new ServiceApiResponse<>(0, "Success",
                        new StaffProfileContract(staffId, UUID.randomUUID(), false)));

        ApiException exception = assertThrows(ApiException.class,
                () -> new StaffIntegrationService(staffServiceClient).requireActiveStaff(staffId));

        assertEquals(ErrorCode.STAFF_PROFILE_INACTIVE, exception.getErrorCode());
    }

    @Test
    void mapsMissingStaffProfileToDomainError() {
        UUID staffId = UUID.randomUUID();
        when(staffServiceClient.getStaffById(staffId)).thenThrow(
                new FeignException.NotFound("staff not found",
                        Request.create(Request.HttpMethod.GET,
                                "http://staff-service/api/staff/" + staffId,
                                Map.of(), new byte[0], StandardCharsets.UTF_8),
                        null,
                        Map.of()));

        ApiException exception = assertThrows(ApiException.class,
                () -> new StaffIntegrationService(staffServiceClient).requireActiveStaff(staffId));

        assertEquals(ErrorCode.STAFF_PROFILE_NOT_FOUND, exception.getErrorCode());
    }
}

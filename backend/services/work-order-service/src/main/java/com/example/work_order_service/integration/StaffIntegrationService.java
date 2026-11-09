package com.example.work_order_service.integration;

import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.client.StaffServiceClient;
import com.example.work_order_service.integration.contract.ServiceApiResponse;
import com.example.work_order_service.integration.contract.StaffProfileContract;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class StaffIntegrationService {

    private final StaffServiceClient staffServiceClient;

    public UUID requireActiveStaff(UUID staffId) {
        ServiceApiResponse<StaffProfileContract> response = fetch(
                () -> staffServiceClient.getStaffById(staffId));
        StaffProfileContract staff = validateResponse(response);
        if (!staffId.equals(staff.id())) {
            throw invalidResponse();
        }
        requireActive(staff);
        return staff.id();
    }

    public UUID requireActiveStaffForUser(UUID userId) {
        ServiceApiResponse<StaffProfileContract> response = fetch(
                () -> staffServiceClient.getStaffByUserId(userId));
        StaffProfileContract staff = validateResponse(response);
        if (!userId.equals(staff.userId())) {
            throw invalidResponse();
        }
        requireActive(staff);
        return staff.id();
    }

    private ServiceApiResponse<StaffProfileContract> fetch(Supplier<ServiceApiResponse<StaffProfileContract>> request) {
        try {
            return request.get();
        } catch (FeignException.NotFound exception) {
            throw new ApiException(ErrorCode.STAFF_PROFILE_NOT_FOUND);
        } catch (FeignException exception) {
            throw new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                    "Không thể lấy hồ sơ nhân viên từ Staff Service");
        }
    }

    private StaffProfileContract validateResponse(ServiceApiResponse<StaffProfileContract> response) {
        StaffProfileContract staff = response == null ? null : response.result();
        if (response == null || response.code() != 0 || staff == null
                || staff.id() == null || staff.isActive() == null) {
            throw invalidResponse();
        }
        return staff;
    }

    private void requireActive(StaffProfileContract staff) {
        if (!Boolean.TRUE.equals(staff.isActive())) {
            throw new ApiException(ErrorCode.STAFF_PROFILE_INACTIVE);
        }
    }

    private ApiException invalidResponse() {
        return new ApiException(ErrorCode.INTEGRATION_SERVICE_UNAVAILABLE,
                "Staff Service trả về hồ sơ nhân viên không hợp lệ");
    }
}

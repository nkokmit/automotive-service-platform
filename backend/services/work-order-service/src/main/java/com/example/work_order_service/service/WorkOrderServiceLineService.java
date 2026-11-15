package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.AssignMechanicRequest;
import com.example.work_order_service.dto.response.AssignedServiceLineResponse;
import com.example.work_order_service.enums.WorkOrderServiceStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.StaffIntegrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkOrderServiceLineService {

    private final WorkOrderServiceLineTransaction transaction;
    private final StaffIntegrationService staffIntegrationService;

    public AssignedServiceLineResponse assign(UUID serviceLineId, AssignMechanicRequest request) {
        UUID mechanicId = staffIntegrationService.requireActiveStaff(request.mechanicId());
        return transaction.assign(serviceLineId, mechanicId);
    }

    public List<AssignedServiceLineResponse> getMyLines(WorkOrderServiceStatus status, Jwt jwt) {
        UUID mechanicId = staffIntegrationService.requireActiveStaffForUser(requireUserId(jwt));
        return transaction.listAssigned(mechanicId, status);
    }

    public AssignedServiceLineResponse start(UUID serviceLineId, Jwt jwt) {
        UUID mechanicId = staffIntegrationService.requireActiveStaffForUser(requireUserId(jwt));
        return transaction.start(serviceLineId, mechanicId);
    }

    public AssignedServiceLineResponse complete(UUID serviceLineId, Jwt jwt) {
        UUID mechanicId = staffIntegrationService.requireActiveStaffForUser(requireUserId(jwt));
        return transaction.complete(serviceLineId, mechanicId);
    }

    private UUID requireUserId(Jwt jwt) {
        if (jwt == null) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        try {
            return UUID.fromString(jwt.getClaimAsString("userId"));
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
    }
}

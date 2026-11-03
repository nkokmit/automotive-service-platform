package com.example.booking_service.service;

import com.example.booking_service.exception.ApiException;
import com.example.booking_service.exception.ErrorCode;

import java.util.HashSet;
import java.util.List;
import java.util.UUID;

public final class ServiceSelectionValidator {

    private ServiceSelectionValidator() {
    }

    public static void validateUnique(List<UUID> serviceIds) {
        if (serviceIds == null || serviceIds.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Danh sách dịch vụ không được rỗng");
        }
        if (serviceIds.stream().anyMatch(id -> id == null)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Mã dịch vụ không được rỗng");
        }
        if (new HashSet<>(serviceIds).size() != serviceIds.size()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Không được chọn lặp dịch vụ");
        }
    }
}

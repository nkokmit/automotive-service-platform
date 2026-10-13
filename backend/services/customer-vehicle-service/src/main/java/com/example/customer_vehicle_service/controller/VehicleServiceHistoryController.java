package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.common.ApiResponse;
import com.example.customer_vehicle_service.dto.request.ServiceHistoryCreateRequest;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import com.example.customer_vehicle_service.service.ServiceHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * API lịch sử bảo dưỡng của một xe (PLAN.md bước 5).
 * Controller mỏng — chỉ validate request và gọi service.
 *
 * <p>Lịch sử là sub-resource của xe nên lồng dưới {@code /api/vehicles/{vehicleId}}
 * thay vì có root riêng. Chỉ có hai endpoint đọc và thêm: bảng lịch sử cố ý
 * không có update/delete vì giữ nguyên dòng dữ liệu để audit.
 *
 * <p>Sắp xếp cố định {@code serviceDate} giảm dần (mới nhất trước) theo yêu cầu
 * của PLAN.md; client có thể đổi qua tham số {@code sortBy}/{@code sortDirection}
 * giống API xe.
 */
@RestController
@RequestMapping("/api/vehicles/{vehicleId}/service-history")
@RequiredArgsConstructor
public class VehicleServiceHistoryController {

    private final ServiceHistoryService serviceHistoryService;

    @GetMapping
    @PreAuthorize("hasAuthority('SERVICE_HISTORY_READ')")
    public ApiResponse<PageResponse<ServiceHistoryResponse>> getServiceHistory(
            @PathVariable UUID vehicleId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "serviceDate") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ApiResponse.success(serviceHistoryService.getServiceHistory(vehicleId, pageable));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SERVICE_HISTORY_CREATE')")
    public ApiResponse<ServiceHistoryResponse> createServiceHistory(
            @PathVariable UUID vehicleId,
            @Valid @RequestBody ServiceHistoryCreateRequest request
    ) {
        return ApiResponse.success("Thêm lịch sử bảo dưỡng thành công",
                serviceHistoryService.createServiceHistory(vehicleId, request));
    }
}
package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.common.ApiResponse;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import com.example.customer_vehicle_service.service.ServiceHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/service-history")
@RequiredArgsConstructor
public class ServiceHistoryAdminController {

    private final ServiceHistoryService serviceHistoryService;

    @GetMapping
    @PreAuthorize("hasAuthority('SERVICE_HISTORY_READ') and not hasAuthority('ROLE_CUSTOMER')")
    public ApiResponse<PageResponse<ServiceHistoryResponse>> getAllServiceHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "serviceDate"));
        return ApiResponse.success(serviceHistoryService.getAllServiceHistory(pageable));
    }
}

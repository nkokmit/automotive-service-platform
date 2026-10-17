package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.common.ApiResponse;
import com.example.customer_vehicle_service.dto.request.VehicleCreateRequest;
import com.example.customer_vehicle_service.dto.request.VehicleUpdateRequest;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.VehicleResponse;
import com.example.customer_vehicle_service.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * CRUD API cho hồ sơ xe (PLAN.md bước 4).
 * Controller mỏng — chỉ validate request và gọi service.
 *
 * <p>Cố ý KHÔNG có endpoint danh sách "xe của tôi": xe không thuộc về khách hàng
 * nào. Khách hàng không xem được danh sách xe của hệ thống, và cũng không có xe
 * nào để xem — lịch sử bảo dưỡng của chính mình nằm ở
 * {@code GET /api/service-history/me}.
 */
@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;

    /**
     * @param licensePlate lọc theo biển số (không phân biệt hoa thường)
     * @param keyword      tìm chuỗi con trong biển số / VIN / hãng / dòng xe
     *
     * <p>Đây là danh sách vận hành của gara: CUSTOMER không được cấp
     * {@code VEHICLE_READ} nên bị chặn hoàn toàn.
     */
    @GetMapping
    @PreAuthorize("hasAuthority('VEHICLE_READ')")
    public ApiResponse<PageResponse<VehicleResponse>> getVehicles(
            @RequestParam(required = false) String licensePlate,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ApiResponse.success(vehicleService.getVehicles(licensePlate, keyword, isActive, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('VEHICLE_READ')")
    public ApiResponse<VehicleResponse> getVehicleById(@PathVariable UUID id) {
        return ApiResponse.success(vehicleService.getVehicleById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('VEHICLE_CREATE')")
    public ApiResponse<VehicleResponse> createVehicle(@Valid @RequestBody VehicleCreateRequest request) {
        return ApiResponse.success("Tạo xe thành công", vehicleService.createVehicle(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('VEHICLE_UPDATE')")
    public ApiResponse<VehicleResponse> updateVehicle(
            @PathVariable UUID id,
            @Valid @RequestBody VehicleUpdateRequest request
    ) {
        return ApiResponse.success("Cập nhật xe thành công", vehicleService.updateVehicle(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('VEHICLE_DELETE')")
    public void deleteVehicle(@PathVariable UUID id) {
        vehicleService.deleteVehicle(id);
    }
}
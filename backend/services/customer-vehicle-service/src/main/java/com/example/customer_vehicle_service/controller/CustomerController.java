package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.common.ApiResponse;
import com.example.customer_vehicle_service.dto.request.CustomerCreateRequest;
import com.example.customer_vehicle_service.dto.request.CustomerUpdateRequest;
import com.example.customer_vehicle_service.dto.response.CustomerResponse;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.service.CustomerService;
import com.example.customer_vehicle_service.service.CurrentCustomerService;
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
 * CRUD API cho hồ sơ khách hàng (PLAN.md bước 3).
 * Controller mỏng — chỉ validate request và gọi service.
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;
    private final CurrentCustomerService currentCustomerService;

    /**
     * Hồ sơ của chính người đang đăng nhập.
     *
     * <p>Endpoint tự phục vụ, không nhận id: caller chỉ xem được hồ sơ của mình
     * nên không có tham số để đổi sang hồ sơ người khác. Chỉ yêu cầu đã đăng
     * nhập — nhân viên gọi được và trả về hồ sơ đã liên kết với tài khoản của
     * họ (nếu có), còn không có thì trả 403.
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<CustomerResponse> getCurrentCustomer() {
        return ApiResponse.success(customerService.getCustomerById(currentCustomerService.getRequiredCustomerId()));
    }

    /**
     * <p>Danh sách vận hành của gara, trả về mọi khách hàng trong hệ thống.
     * CUSTOMER không được cấp quyền này (xem V5 của user-service) nên điều kiện
     * {@code hasAuthority} là đủ để chặn. Khách hàng dùng
     * {@code GET /api/customers/me} để lấy hồ sơ của chính mình.
     */
    @GetMapping
    @PreAuthorize("hasAuthority('CUSTOMER_READ')")
    public ApiResponse<PageResponse<CustomerResponse>> getCustomers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ApiResponse.success(customerService.getCustomers(keyword, isActive, pageable));
    }

    /**
     * Chi tiết một khách hàng bất kỳ. CUSTOMER không được cấp quyền
     * {@code CUSTOMER_READ} nên bị chặn, dùng {@code /me} để xem hồ sơ của mình.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CUSTOMER_READ')")
    public ApiResponse<CustomerResponse> getCustomerById(@PathVariable UUID id) {
        return ApiResponse.success(customerService.getCustomerById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('CUSTOMER_CREATE')")
    public ApiResponse<CustomerResponse> createCustomer(@Valid @RequestBody CustomerCreateRequest request) {
        return ApiResponse.success("Tạo khách hàng thành công", customerService.createCustomer(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CUSTOMER_UPDATE')")
    public ApiResponse<CustomerResponse> updateCustomer(
            @PathVariable UUID id,
            @Valid @RequestBody CustomerUpdateRequest request
    ) {
        return ApiResponse.success("Cập nhật khách hàng thành công", customerService.updateCustomer(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('CUSTOMER_DELETE')")
    public void deleteCustomer(@PathVariable UUID id) {
        customerService.deleteCustomer(id);
    }
}
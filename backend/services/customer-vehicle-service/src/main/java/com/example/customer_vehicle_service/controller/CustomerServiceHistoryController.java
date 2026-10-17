package com.example.customer_vehicle_service.controller;

import com.example.customer_vehicle_service.common.ApiResponse;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import com.example.customer_vehicle_service.service.CurrentCustomerService;
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

import java.util.UUID;

/**
 * API lịch sử bảo dưỡng của chính người đang đăng nhập.
 *
 * <p>Đây là endpoint DUY NHẤT trong toàn hệ thống mà khách hàng đọc được lịch
 * sử, và nó cố ý không nhận tham số {@code customerId}: danh tính lấy từ token,
 * không lấy từ client — nếu lấy từ client thì đây sẽ là chỗ rò dữ liệu khách
 * hàng đầu tiên và dễ bị quên chặn. Nhánh nhân viên cùng đọc lịch sử theo khách
 * hàng nằm ở {@link CustomerServiceHistoryByIdController}, chỉ mở cho người
 * không giữ role CUSTOMER.
 *
 * <p>Phân biệt rõ với {@link VehicleServiceHistoryController}: đó là lịch sử
 * kỹ thuật của một xe dành cho nhân viên, đây là lịch sử của một người dành
 * cho chủ tài khoản đang đăng nhập.
 *
 * <p>Root {@code /api/service-history} thay vì lồng dưới {@code /api/vehicles}
 * vì dữ liệu ở đây KHÔNG xuất phát từ xe mà xuất phát từ người — một người
 * có thể có nhiều bản ghi của nhiều xe khác nhau, và cây tài nguyên lồng kiểu
 * xe sẽ gợi ý sai rằng bản ghi này thuộc về xe.
 */
@RestController
@RequestMapping("/api/service-history")
@RequiredArgsConstructor
public class CustomerServiceHistoryController {

    private final ServiceHistoryService serviceHistoryService;
    private final CurrentCustomerService currentCustomerService;

    /**
     * Lịch sử của những lần chính người đang đăng nhập mang xe tới, mới nhất
     * trước.
     *
     * <p>{@code isAuthenticated()} thay vì
     * {@code hasAuthority('SERVICE_HISTORY_READ_SELF')} là cố ý: quyền đọc lịch
     * sử của chính mình không cần được cấp riêng, ai đã đăng nhập cũng có. Cách
     * này để endpoint không phụ thuộc vào dữ liệu quyền trong user-service — nếu
     * job cấp quyền chạy lỗi, khách hàng vẫn xem được dữ liệu của chính mình
     * thay vì bị chặn oan. Và nếu sau này quyết định chỉ cho CUSTOMER dùng thì
     * đổi annotation là đủ, logic không phải sửa.
     *
     * <p>Đối lập với việc thu hồi {@code SERVICE_HISTORY_READ} của CUSTOMER
     * ({@code V7__restrict_customer_service_history_reads.sql}): mất quyền đọc
     * lịch sử của MỌI xe, nhưng không mất khả năng đọc lịch sử của chính mình.
     *
     * <p>Cố ý không nhận {@code sortBy}/{@code sortDirection}: thứ tự
     * {@code serviceDate} giảm dần là ý nghĩa của màn hình "lần bảo dưỡng gần
     * nhất", để client đảo thứ tự sẽ làm người dùng tưởng mới nhất nằm cuối.
     * Phân trang vẫn để mở vì số lần bảo dưỡng có thể rất nhiều.
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PageResponse<ServiceHistoryResponse>> getMyServiceHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "serviceDate"));
        UUID customerId = currentCustomerService.getRequiredCustomerId();
        return ApiResponse.success(
                serviceHistoryService.getServiceHistoryByCustomer(customerId, pageable));
    }
}

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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Lịch sử bảo dưỡng của MỘT khách hàng bất kỳ, dành cho nhân viên gara.
 *
 * <p>Tách khỏi {@link CustomerServiceHistoryController} (lịch sử của chính mình,
 * lấy danh tính từ token) vì đây là hai đối tượng khác nhau: một bên là người
 * đang đăng nhập, một bên là hồ sơ được chỉ định trong URL. Tách khỏi
 * {@link VehicleServiceHistoryController} vì lịch sử theo khách hàng gom mọi
 * lần khách đó mang BẤT KỲ xe nào tới, còn lịch sử theo xe là dữ liệu kỹ thuật
 * của một chiếc xe — hai cách nhìn khác nhau trên cùng một bảng dữ liệu.
 *
 * <p>Controller mỏng: nhận request, dựng {@link Pageable}, gọi service, trả về
 * (GLOBAL_RULES §11). Chỉ khác {@code /me} ở chỗ lấy {@code customerId} từ
 * {@code @PathVariable} thay vì từ {@code CurrentCustomerService}.
 *
 * <p>Lồng dưới {@code /api/customers/{customerId}} theo đúng khuôn của
 * {@code /api/vehicles/{vehicleId}/service-history}: lịch sử là sub-resource
 * của chủ thể sở hữu nó trong URL. Gateway đã route sẵn {@code /api/customers/**}
 * nên không cần thêm route mới.
 */
@RestController
@RequestMapping("/api/customers/{customerId}/service-history")
@RequiredArgsConstructor
public class CustomerServiceHistoryByIdController {

    private final ServiceHistoryService serviceHistoryService;

    /**
     * Những lần khách hàng đã mang xe đến, mới nhất trước.
     *
     * <p>Cố ý KHÔNG kiểm tra khách hàng có tồn tại, khác
     * {@link VehicleServiceHistoryController} (trả 2101 cho id xe sai). Lý do
     * là dữ liệu lịch sử phải còn tra được cho khách hàng đã xoá mềm: nhân
     * viên cần đọc lịch sử của một hồ sơ cũ để audit, và bản ghi lịch sử cố ý
     * không mang {@code @SQLRestriction}. Nếu chặn ở đây thì chính xác những hồ
     * sơ cần điều tra nhất lại không đọc được.
     *
     * <p>Hệ quả cần biết: id khách hàng sai vẫn trả 200 với trang rỗng, không
     * phải 404. Endpoint này không phải existence oracle — khách hàng và nhân
     * viên vốn không cần che id của nhau, và {@code @PreAuthorize} đã chặn khách
     * hàng từ trước khi tới đây.
     *
     * <p>Cố ý không nhận {@code sortBy}/{@code sortDirection} (khác API của xe):
     * thứ tự {@code serviceDate} giảm dần là ý nghĩa của màn hình "lần bảo
     * dưỡng gần nhất", và repository {@code findByCustomerIdOrderByServiceDateDesc}
     * đã cố định sắp xếp đó. Cho client đảo thứ tự sẽ làm người dùng tưởng
     * lần mới nhất nằm cuối danh sách — cùng lý do {@code /me} đã chọn.
     *
     * <p>Điều kiện phân quyền gồm hai mệnh đề, cả hai đều cần thiết:
     * <ul>
     *   <li>{@code hasAuthority('SERVICE_HISTORY_READ')} — quyền đọc lịch sử của
     *       nhân viên. {@code V7__restrict_customer_service_history_reads.sql} đã
     *       thu hồi quyền này khỏi CUSTOMER nên mệnh đề này chặn được khách
     *       hàng ở trạng thái cấu hình hiện tại.</li>
     *   <li>{@code not hasAuthority('ROLE_CUSTOMER')} — chốt chặn cuối cùng,
     *       lặp lại đúng cách {@code ServiceHistoryServiceImpl#requireCallerIsNotCustomer}
     *       bảo vệ API lịch sử theo xe. Nếu sau này có migration cấp lại
     *       {@code SERVICE_HISTORY_READ} cho CUSTOMER (giống V6 đã làm một lần),
     *       endpoint này sẽ biến thành nơi rò toàn bộ lịch sử của mọi khách hàng
     *       chỉ bằng cách đoán id — trong khi API theo xe vẫn được bảo vệ. Kiểm
     *       tra theo role bám vào authority {@code ROLE_CUSTOMER} do
     *       {@code User#getAuthorities} sinh ra, nên không phụ thuộc dữ liệu quyền.</li>
     * </ul>
     *
     * <p>Đánh đổi của mệnh đề thứ hai: một nhân viên kiêm khách hàng (đang giữ
     * cả hai role) cũng bị chặn ở endpoint này. Chấp nhận được vì đây là đường
     * bảo vệ dữ liệu và fail-closed là ưu tiên — nhân viên vẫn xem được lịch sử
     * của chính mình qua {@code /api/service-history/me}.
     */
    @GetMapping
    @PreAuthorize("hasAuthority('SERVICE_HISTORY_READ') and not hasAuthority('ROLE_CUSTOMER')")
    public ApiResponse<PageResponse<ServiceHistoryResponse>> getCustomerServiceHistory(
            @PathVariable UUID customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "serviceDate"));
        return ApiResponse.success(
                serviceHistoryService.getServiceHistoryByCustomer(customerId, pageable));
    }
}

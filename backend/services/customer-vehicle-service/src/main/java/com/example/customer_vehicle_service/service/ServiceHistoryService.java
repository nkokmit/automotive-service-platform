package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.ServiceHistoryCreateRequest;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.dto.response.ServiceHistoryResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Nghiệp vụ lịch sử bảo dưỡng (PLAN.md bước 5).
 *
 * <p>Phạm vi cố ý hẹp: chỉ lưu bản ghi lịch sử của một xe. Không lưu chi tiết
 * hạng mục sửa chữa, phụ tùng, báo giá hay hoá đơn — những dữ liệu đó thuộc
 * work-order-service, giữ ở đây sẽ tạo hai nguồn sự thật.
 *
 * <p>Bản ghi loại {@code GARAGE_SERVICE} (sinh ra từ Work Order hoàn thành) không
 * tạo được qua service này — xem {@link #createServiceHistory}.
 *
 * <p>Hai cách đọc lịch sử, tách bạch về mặt ý nghĩa:
 * <ul>
 *   <li>{@link #getServiceHistory} — lịch sử kỹ thuật của một xe, chỉ nhân viên.
 *       Xem tất cả các lần xe từng tới gara, bất kể ai mang tới.</li>
 *   <li>{@link #getServiceHistoryByCustomer} — lịch sử của chính khách hàng đang
 *       đăng nhập, chỉ những lần CHÍNH họ mang xe tới.</li>
 * </ul>
 */
public interface ServiceHistoryService {

    /**
     * Lịch sử bảo dưỡng của một xe, sắp xếp {@code service_date} giảm dần.
     *
     * <p>Chỉ nhân viên gọi được — xem {@code ServiceHistoryServiceImpl} để biết vì
     * sao khách hàng bị chặn thay vì được lọc theo xe.
     *
     * <p>Lịch sử tra được cả khi xe đã xoá mềm, vì bảng lịch sử cố ý không có
     * soft delete và {@code VehicleServiceHistory} không dùng
     * {@code @SQLRestriction}.
     */
    PageResponse<ServiceHistoryResponse> getServiceHistory(UUID vehicleId, Pageable pageable);

    /**
     * Lịch sử của một khách hàng, sắp xếp {@code service_date} giảm dần.
     *
     * <p>Đây là nguồn dữ liệu duy nhất khách hàng được xem: mỗi bản ghi trả về là
     * một lần khách hàng đó mang xe tới. Không có khái niệm "xe của tôi" nên
     * cũng không có chuyện khách A thấy dữ liệu của khách B qua cùng một xe.
     *
     * <p>Phục vụ hai loại caller khác nhau, tách quyền ở tầng controller chứ không
     * ở đây:
     * <ul>
     *   <li>khách hàng đang đăng nhập — {@code GET /api/service-history/me},
     *       {@code currentCustomerService} ánh xạ token thành hồ sơ trước khi
     *       gọi tới đây;</li>
     *   <li>nhân viên xem hồ sơ được chỉ định —
     *       {@code GET /api/customers/{customerId}/service-history}.</li>
     * </ul>
     * Cố ý không thêm kiểm tra sở hữu cho nhánh nhân viên: đó là dữ liệu vận
     * hành của gara, và người đọc đã bị {@code @PreAuthorize} chặn là CUSTOMER
     * rồi.
     *
     * <p>Cố ý không kiểm tra khách hàng có tồn tại: lịch sử phải tra được cả khi
     * hồ sơ đã xoá mềm (bảng lịch sử không dùng {@code @SQLRestriction}), và ở
     * nhánh {@code /me} thì khách hàng không tồn tại đã bị chặn từ trước. Đổi
     * lại, id không tồn tại trả về trang rỗng chứ không phải
     * {@link com.example.customer_vehicle_service.exception.CustomerNotFoundException}.
     */
    PageResponse<ServiceHistoryResponse> getServiceHistoryByCustomer(UUID customerId,
                                                                      Pageable pageable);

    /**
     * Nhập bản ghi lịch sử từ gara bên ngoài hoặc thông tin khách hàng cung cấp.
     *
     * <p>Xe phải tồn tại và chưa bị xoá mềm. Loại bản ghi
     * {@code GARAGE_SERVICE} bị từ chối — loại đó dành cho Kafka consumer tạo từ
     * Work Order hoàn thành, và {@code workOrderId} vốn không có trong request
     * nên client không thể tự sinh bản ghi hệ thống.
     *
     * <p>{@code customerId} trong request là tuỳ chọn: để trống nghĩa là bản ghi
     * không gắn với ai (xe gửi hộ, nhập hậu kỳ từ hồ sơ giấy). Khi có gửi lên,
     * khách hàng phải tồn tại — nhưng không cần còn hoạt động, vì trạng thái
     * {@code isActive = FALSE} chính là "đang gửi xe đi bảo dưỡng".
     */
    ServiceHistoryResponse createServiceHistory(UUID vehicleId,
                                                ServiceHistoryCreateRequest request);
}
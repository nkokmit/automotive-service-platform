package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.CustomerCreateRequest;
import com.example.customer_vehicle_service.dto.request.CustomerUpdateRequest;
import com.example.customer_vehicle_service.dto.response.CustomerResponse;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Nghiệp vụ hồ sơ khách hàng (PLAN.md bước 3).
 */
public interface CustomerService {

    /**
     * Danh sách khách hàng có phân trang và lọc.
     *
     * @param keyword  từ khoá tìm trong họ tên / số điện thoại / email, không phân
     *                 biệt hoa thường. {@code null} hoặc rỗng thì không lọc.
     * @param isActive lọc theo trạng thái hoạt động. {@code null} thì không lọc.
     */
    PageResponse<CustomerResponse> getCustomers(String keyword, Boolean isActive, Pageable pageable);

    /**
     * Chi tiết một khách hàng. Khách hàng đã xoá mềm không trả về.
     */
    CustomerResponse getCustomerById(UUID id);

    CustomerResponse createCustomer(CustomerCreateRequest request);

    /**
     * Cập nhật một phần: field {@code null} trong request được giữ nguyên.
     */
    CustomerResponse updateCustomer(UUID id, CustomerUpdateRequest request);

    /**
     * Xoá mềm. Từ chối nếu khách hàng còn xe đang hoạt động.
     */
    void deleteCustomer(UUID id);
}
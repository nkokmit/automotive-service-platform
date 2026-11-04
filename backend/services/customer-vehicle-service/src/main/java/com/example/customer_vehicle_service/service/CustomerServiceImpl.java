package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.CustomerCreateRequest;
import com.example.customer_vehicle_service.dto.request.CustomerUpdateRequest;
import com.example.customer_vehicle_service.dto.response.CustomerResponse;
import com.example.customer_vehicle_service.dto.response.PageResponse;
import com.example.customer_vehicle_service.entity.Customer;
import com.example.customer_vehicle_service.exception.CustomerAlreadyExistsException;
import com.example.customer_vehicle_service.exception.CustomerNotFoundException;
import com.example.customer_vehicle_service.mapper.CustomerMapper;
import com.example.customer_vehicle_service.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerMapper customerMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> getCustomers(String keyword, Boolean isActive,
                                                      Pageable pageable) {
        Page<Customer> page = customerRepository.search(normalizeKeyword(keyword), isActive, pageable);
        return PageResponse.from(page, customerMapper::toCustomerResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(UUID id) {
        // findById chịu @SQLRestriction nên khách hàng đã xoá mềm không lấy được.
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new CustomerNotFoundException("Không tìm thấy khách hàng với id: " + id));
        return customerMapper.toCustomerResponse(customer);
    }

    @Override
    public CustomerResponse createCustomer(CustomerCreateRequest request) {
        // Tài khoản không được liên kết với hồ sơ khác, kể cả hồ sơ đã xoá mềm.
        if (request.userId() != null && customerRepository.countByUserIdIncludingDeleted(request.userId()) > 0) {
            throw new CustomerAlreadyExistsException(
                    "Tài khoản đã được liên kết với khách hàng khác: " + request.userId());
        }

        Customer customer = Customer.builder()
                .fullName(request.fullName())
                .phone(request.phone())
                .email(request.email())
                .address(request.address())
                .notes(request.notes())
                .userId(request.userId())
                .isActive(request.isActive() == null ? Boolean.TRUE : request.isActive())
                .build();

        Customer saved = customerRepository.save(customer);
        log.info("Đã tạo khách hàng mới: {} ({})", saved.getFullName(), saved.getId());
        return customerMapper.toCustomerResponse(saved);
    }

    @Override
    public CustomerResponse updateCustomer(UUID id, CustomerUpdateRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new CustomerNotFoundException("Không tìm thấy khách hàng với id: " + id));

        if (request.userId() != null && !request.userId().equals(customer.getUserId())) {
            validateUserIdAvailable(request.userId());
            customer.setUserId(request.userId());
        }
        if (request.fullName() != null) {
            customer.setFullName(request.fullName());
        }
        if (request.phone() != null) {
            customer.setPhone(request.phone());
        }
        if (request.email() != null) {
            customer.setEmail(request.email());
        }
        if (request.address() != null) {
            customer.setAddress(request.address());
        }
        if (request.notes() != null) {
            customer.setNotes(request.notes());
        }
        if (request.isActive() != null) {
            customer.setIsActive(request.isActive());
        }

        Customer saved = customerRepository.save(customer);
        log.info("Đã cập nhật khách hàng: {}", saved.getId());
        return customerMapper.toCustomerResponse(saved);
    }

    @Override
    public void deleteCustomer(UUID id) {
        // Dùng native query để bypass @SQLRestriction — idempotent nếu đã xoá trước đó.
        Customer customer = customerRepository.findByIdRaw(id)
                .orElseThrow(() -> new CustomerNotFoundException("Không tìm thấy khách hàng với id: " + id));

        if (customer.getDeletedAt() != null) {
            log.info("Khách hàng {} đã được xoá trước đó — bỏ qua (idempotent)", id);
            return;
        }

        // Cố ý KHÔNG kiểm tra "còn xe hoạt động" nữa: xe không thuộc về khách hàng
        // nữa nên không có khái niệm xe của khách hàng này. Việc một khách từng
        // mang xe tới không ngăn được việc xoá hồ sơ — dữ liệu lịch sử được
        // giữ nguyên để audit, và đây là bản ghi của một sự kiện đã xảy ra, không
        // phải tài sản đang vận hành.
        customer.setDeletedAt(Instant.now());
        customer.setIsActive(Boolean.FALSE);
        customerRepository.save(customer);
        log.info("Đã soft delete khách hàng: {}", id);
    }

    // ===== Helpers =====

    /**
     * Chuẩn hoá từ khoá tìm kiếm về {@code null} khi rỗng để query bỏ qua
     * điều kiện tìm kiếm thay vì so khớp chuỗi rỗng.
     */
    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return keyword.trim();
    }

    /**
     * Chặn gắn một tài khoản đã thuộc hồ sơ khác — kể cả hồ sơ đã xoá mềm,
     * khớp với ràng buộc {@code uk_customers_user_id}.
     *
     * <p>Chỉ cần exists check: {@link #updateCustomer} chỉ gọi hàm này khi
     * {@code userId} mới khác {@code userId} hiện tại, nên nếu trả true thì
     * chắc chắn là hồ sơ khác đang giữ tài khoản đó.
     */
    private void validateUserIdAvailable(UUID userId) {
        if (customerRepository.countByUserIdIncludingDeleted(userId) > 0) {
            throw new CustomerAlreadyExistsException(
                    "Tài khoản đã được liên kết với khách hàng khác: " + userId);
        }
    }

}
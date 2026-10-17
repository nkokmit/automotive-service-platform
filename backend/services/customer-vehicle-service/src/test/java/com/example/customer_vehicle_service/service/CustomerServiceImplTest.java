package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.dto.request.CustomerCreateRequest;
import com.example.customer_vehicle_service.dto.request.CustomerUpdateRequest;
import com.example.customer_vehicle_service.dto.response.CustomerResponse;
import com.example.customer_vehicle_service.entity.Customer;
import com.example.customer_vehicle_service.exception.CustomerAlreadyExistsException;
import com.example.customer_vehicle_service.exception.CustomerNotFoundException;
import com.example.customer_vehicle_service.mapper.CustomerMapper;
import com.example.customer_vehicle_service.repository.CustomerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * Unit test cho {@link CustomerServiceImpl}.
 *
 * <p>Dùng Mockito thay vì {@code @SpringBootTest} vì logic chỉ cần repository +
 * mapper — không cần MySQL/Flyway, nên test chạy được kể cả khi DB chưa dựng.
 */
@ExtendWith(MockitoExtension.class)
class CustomerServiceImplTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private CustomerMapper customerMapper;

    @InjectMocks
    private CustomerServiceImpl customerService;

    private static final UUID CUSTOMER_ID = UUID.randomUUID();

    // ===== Tạo khách hàng =====

    @Test
    void createCustomer_persistsProfileAndDefaultsToActive() {
        UUID userId = UUID.randomUUID();
        CustomerCreateRequest request = new CustomerCreateRequest(
                "Nguyễn Văn A", "0901234567", "a@example.com", "Hà Nội", "ghi chú", userId, null);

        given(customerRepository.existsByUserIdIncludingDeleted(userId)).willReturn(false);
        given(customerRepository.save(any(Customer.class))).willAnswer(invocation -> invocation.getArgument(0));
        CustomerResponse expected = response(TRUE);
        given(customerMapper.toCustomerResponse(any(Customer.class))).willReturn(expected);

        CustomerResponse result = customerService.createCustomer(request);

        assertThat(result).isEqualTo(expected);

        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());
        Customer saved = captor.getValue();
        assertThat(saved.getFullName()).isEqualTo("Nguyễn Văn A");
        assertThat(saved.getPhone()).isEqualTo("0901234567");
        assertThat(saved.getUserId()).isEqualTo(userId);
        // isActive null phải mặc định TRUE, khớn @Builder.Default của entity.
        assertThat(saved.getIsActive()).isTrue();
    }

    @Test
    void createCustomer_throwsWhenUserIdAlreadyLinked() {
        UUID userId = UUID.randomUUID();
        CustomerCreateRequest request = new CustomerCreateRequest(
                "Nguyễn Văn A", "0901234567", null, null, null, userId, null);

        given(customerRepository.existsByUserIdIncludingDeleted(userId)).willReturn(true);

        assertThatThrownBy(() -> customerService.createCustomer(request))
                .isInstanceOf(CustomerAlreadyExistsException.class)
                .hasMessageContaining(userId.toString());

        verify(customerRepository, never()).save(any());
    }

    // ===== Đọc khách hàng =====

    @Test
    void getCustomerById_returnsProfile() {
        Customer customer = customer();
        CustomerResponse expected = response(TRUE);
        given(customerRepository.findById(CUSTOMER_ID)).willReturn(Optional.of(customer));
        given(customerMapper.toCustomerResponse(customer)).willReturn(expected);

        CustomerResponse result = customerService.getCustomerById(CUSTOMER_ID);

        assertThat(result).isEqualTo(expected);
        verify(customerRepository).findById(CUSTOMER_ID);
    }

    @Test
    void getCustomerById_throwsWhenNotFound() {
        given(customerRepository.findById(CUSTOMER_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.getCustomerById(CUSTOMER_ID))
                .isInstanceOf(CustomerNotFoundException.class)
                .hasMessageContaining(CUSTOMER_ID.toString());
    }

    @Test
    void getCustomers_mapsPageAndTrimsKeyword() {
        Pageable pageable = PageRequest.of(0, 20);
        Customer customer = customer();
        CustomerResponse expected = response(TRUE);
        given(customerRepository.search("0901234", TRUE, pageable))
                .willReturn(new PageImpl<>(List.of(customer), pageable, 1));
        given(customerMapper.toCustomerResponse(customer)).willReturn(expected);

        var result = customerService.getCustomers("  0901234  ", TRUE, pageable);

        assertThat(result.items()).containsExactly(expected);
        assertThat(result.totalElements()).isEqualTo(1);
        verify(customerRepository).search("0901234", TRUE, pageable);
    }

    @Test
    void getCustomers_passesNullKeywordWhenBlank() {
        Pageable pageable = PageRequest.of(0, 20);
        given(customerRepository.search(null, null, pageable))
                .willReturn(new PageImpl<>(List.of(), pageable, 0));

        var result = customerService.getCustomers("   ", null, pageable);

        assertThat(result.items()).isEmpty();
        verify(customerRepository).search(null, null, pageable);
    }

    // ===== Cập nhật khách hàng =====

    @Test
    void updateCustomer_appliesOnlyNonNullFields() {
        Customer customer = customer();
        given(customerRepository.findById(CUSTOMER_ID)).willReturn(Optional.of(customer));
        given(customerRepository.save(customer)).willReturn(customer);
        CustomerResponse expected = response(TRUE);
        given(customerMapper.toCustomerResponse(customer)).willReturn(expected);

        // email/address/notes/isActive null phải giữ nguyên giá trị cũ.
        CustomerUpdateRequest request = new CustomerUpdateRequest(
                "Nguyễn Văn B", "0987654321", null, null, null, null, null);

        CustomerResponse result = customerService.updateCustomer(CUSTOMER_ID, request);

        assertThat(result).isEqualTo(expected);
        assertThat(customer.getFullName()).isEqualTo("Nguyễn Văn B");
        assertThat(customer.getPhone()).isEqualTo("0987654321");
        assertThat(customer.getEmail()).isEqualTo("a@example.com");
        verify(customerRepository).save(customer);
    }

    @Test
    void updateCustomer_throwsWhenNotFound() {
        given(customerRepository.findById(CUSTOMER_ID)).willReturn(Optional.empty());
        CustomerUpdateRequest request = new CustomerUpdateRequest("Nguyễn Văn B", null, null, null, null, null, null);

        assertThatThrownBy(() -> customerService.updateCustomer(CUSTOMER_ID, request))
                .isInstanceOf(CustomerNotFoundException.class);
    }

    @Test
    void updateCustomer_throwsWhenUserIdBelongsToAnotherProfile() {
        UUID takenUserId = UUID.randomUUID();
        Customer customer = customer();
        given(customerRepository.findById(CUSTOMER_ID)).willReturn(Optional.of(customer));
        given(customerRepository.existsByUserIdIncludingDeleted(takenUserId)).willReturn(true);
        CustomerUpdateRequest request = new CustomerUpdateRequest(
                null, null, null, null, null, takenUserId, null);

        assertThatThrownBy(() -> customerService.updateCustomer(CUSTOMER_ID, request))
                .isInstanceOf(CustomerAlreadyExistsException.class);

        verify(customerRepository, never()).save(any());
    }

    @Test
    void updateCustomer_skipsUserIdCheckWhenUnchanged() {
        Customer customer = customer();
        UUID currentUserId = customer.getUserId();
        given(customerRepository.findById(CUSTOMER_ID)).willReturn(Optional.of(customer));
        given(customerRepository.save(customer)).willReturn(customer);
        given(customerMapper.toCustomerResponse(customer)).willReturn(response(TRUE));
        CustomerUpdateRequest request = new CustomerUpdateRequest(
                "Nguyễn Văn B", null, null, null, null, currentUserId, null);

        customerService.updateCustomer(CUSTOMER_ID, request);

        // Giữ nguyên userId hiện tại không được gọi exists check.
        verify(customerRepository, never()).existsByUserIdIncludingDeleted(any());
    }

    // ===== Xoá mềm =====

    /**
     * Xoá hồ sơ không còn bị chặn vì "còn xe hoạt động": xe không thuộc về khách
     * hàng nữa nên không có xe nào của khách hàng này. Lịch sử bảo dưỡng vẫn
     * được giữ nguyên để audit.
     */
    @Test
    void deleteCustomer_softDeletesRegardlessOfVehicleHistory() {
        Customer customer = customer();
        given(customerRepository.findByIdRaw(CUSTOMER_ID)).willReturn(Optional.of(customer));

        customerService.deleteCustomer(CUSTOMER_ID);

        assertThat(customer.getDeletedAt()).isNotNull();
        assertThat(customer.getIsActive()).isFalse();
        verify(customerRepository).save(customer);
    }

    @Test
    void deleteCustomer_isIdempotentWhenAlreadyDeleted() {
        Customer customer = customer();
        customer.setDeletedAt(Instant.now());
        given(customerRepository.findByIdRaw(CUSTOMER_ID)).willReturn(Optional.of(customer));

        customerService.deleteCustomer(CUSTOMER_ID);

        verify(customerRepository, never()).save(any());
    }

    @Test
    void deleteCustomer_throwsWhenNotFound() {
        given(customerRepository.findByIdRaw(CUSTOMER_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.deleteCustomer(CUSTOMER_ID))
                .isInstanceOf(CustomerNotFoundException.class);
    }

    // ===== Helpers =====

    private static final Boolean TRUE = Boolean.TRUE;

    private Customer customer() {
        return Customer.builder()
                .id(CUSTOMER_ID)
                .userId(UUID.randomUUID())
                .fullName("Nguyễn Văn A")
                .phone("0901234567")
                .email("a@example.com")
                .isActive(Boolean.TRUE)
                .build();
    }

    private CustomerResponse response(Boolean isActive) {
        return new CustomerResponse(
                CUSTOMER_ID, UUID.randomUUID(), "Nguyễn Văn A", "0901234567",
                "a@example.com", "Hà Nội", null, isActive, Instant.now(), Instant.now());
    }
}
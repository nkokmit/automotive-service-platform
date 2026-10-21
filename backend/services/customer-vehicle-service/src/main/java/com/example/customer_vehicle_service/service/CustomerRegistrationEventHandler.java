package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.entity.Customer;
import com.example.customer_vehicle_service.messaging.UserRegisteredEvent;
import com.example.customer_vehicle_service.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerRegistrationEventHandler {

    private final CustomerRepository customerRepository;

    @Transactional
    public void handle(UserRegisteredEvent event) {
        if (customerRepository.countByUserIdIncludingDeleted(event.userId()) > 0) {
            log.info("Bỏ qua UserRegistered event đã xử lý: userId={}", event.userId());
            return;
        }

        var matchingCustomers = customerRepository.findUnlinkedByEmailOrPhone(event.email(), event.phone());
        matchingCustomers.forEach(customer -> customer.setIsActive(Boolean.FALSE));
        if (!matchingCustomers.isEmpty()) {
            customerRepository.saveAll(matchingCustomers);
            log.info("Đã inactive {} hồ sơ khách chưa liên kết khớp contact userId={}",
                    matchingCustomers.size(), event.userId());
        }

        String fullName = event.fullName() == null || event.fullName().isBlank()
                ? event.username()
                : event.fullName();
        Customer customer = Customer.builder()
                .userId(event.userId())
                .fullName(fullName)
                .email(event.email())
                .phone(event.phone())
                .isActive(Boolean.TRUE)
                .build();
        customerRepository.save(customer);
        log.info("Đã tạo hồ sơ khách hàng từ đăng ký userId={}", event.userId());
    }
}

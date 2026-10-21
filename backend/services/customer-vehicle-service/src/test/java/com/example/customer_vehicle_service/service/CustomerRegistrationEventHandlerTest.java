package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.entity.Customer;
import com.example.customer_vehicle_service.messaging.UserRegisteredEvent;
import com.example.customer_vehicle_service.repository.CustomerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CustomerRegistrationEventHandlerTest {

    @Mock
    private CustomerRepository customerRepository;

    @InjectMocks
    private CustomerRegistrationEventHandler eventHandler;

    @Test
    void handle_inactivatesMatchingUnlinkedProfilesAndCreatesLinkedCustomer() {
        UUID userId = UUID.randomUUID();
        UserRegisteredEvent event = new UserRegisteredEvent(
                userId, "new-user", "New User", "shared@example.com", null);
        Customer manualProfile = Customer.builder()
                .id(UUID.randomUUID())
                .fullName("Manually Entered")
                .email(event.email())
                .phone(null)
                .isActive(Boolean.TRUE)
                .build();
        given(customerRepository.countByUserIdIncludingDeleted(userId)).willReturn(0L);
        given(customerRepository.findUnlinkedByEmailOrPhone(event.email(), event.phone()))
                .willReturn(List.of(manualProfile));
        given(customerRepository.save(any(Customer.class))).willAnswer(invocation -> invocation.getArgument(0));

        eventHandler.handle(event);

        assertThat(manualProfile.getIsActive()).isFalse();
        verify(customerRepository).saveAll(List.of(manualProfile));
        ArgumentCaptor<Customer> customerCaptor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(customerCaptor.capture());
        Customer linkedProfile = customerCaptor.getValue();
        assertThat(linkedProfile.getUserId()).isEqualTo(userId);
        assertThat(linkedProfile.getFullName()).isEqualTo("New User");
        assertThat(linkedProfile.getEmail()).isEqualTo(event.email());
        assertThat(linkedProfile.getPhone()).isNull();
        assertThat(linkedProfile.getIsActive()).isTrue();
    }

    @Test
    void handle_usesUsernameWhenRegisteredFullNameIsMissing() {
        UUID userId = UUID.randomUUID();
        UserRegisteredEvent event = new UserRegisteredEvent(
                userId, "new-user", null, "new@example.com", "0901234567");
        given(customerRepository.countByUserIdIncludingDeleted(userId)).willReturn(0L);
        given(customerRepository.findUnlinkedByEmailOrPhone(event.email(), event.phone())).willReturn(List.of());
        given(customerRepository.save(any(Customer.class))).willAnswer(invocation -> invocation.getArgument(0));

        eventHandler.handle(event);

        ArgumentCaptor<Customer> customerCaptor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(customerCaptor.capture());
        assertThat(customerCaptor.getValue().getFullName()).isEqualTo(event.username());
    }

    @Test
    void handle_ignoresAlreadyProcessedRegistration() {
        UUID userId = UUID.randomUUID();
        UserRegisteredEvent event = new UserRegisteredEvent(
                userId, "new-user", "New User", "new@example.com", null);
        given(customerRepository.countByUserIdIncludingDeleted(userId)).willReturn(1L);

        eventHandler.handle(event);

        verify(customerRepository, never()).findUnlinkedByEmailOrPhone(any(), any());
        verify(customerRepository, never()).save(any(Customer.class));
    }
}

package com.example.notification_service.service;

import com.example.notification_service.dto.request.SendNotificationRequest;
import com.example.notification_service.enums.NotificationCategory;
import com.example.notification_service.enums.RecipientType;
import com.example.notification_service.exception.ApiException;
import com.example.notification_service.exception.ErrorCode;
import com.example.notification_service.repository.NotificationDeliveryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class NotificationSendServiceTest {

    @Mock
    private NotificationDeliveryRepository deliveryRepository;

    @Mock
    private NotificationApplicationService applicationService;

    private NotificationSendService sendService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sendService = new NotificationSendServiceImpl(deliveryRepository, applicationService);
    }

    @Test
    void rejectsEmailRequestWithoutRecipientAddressBeforeCreatingNotification() {
        SendNotificationRequest request = new SendNotificationRequest(
                RecipientType.CUSTOMER,
                UUID.randomUUID(),
                NotificationCategory.SYSTEM,
                "Title",
                "Content",
                null,
                null,
                true,
                " "
        );

        ApiException exception = assertThrows(ApiException.class, () -> sendService.send(request));

        assertEquals(ErrorCode.INVALID_REQUEST, exception.getErrorCode());
        verify(applicationService, never()).create(any());
    }
}

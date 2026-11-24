package com.example.notification_service.service;

import com.example.notification_service.dto.request.SendNotificationRequest;
import com.example.notification_service.dto.response.NotificationResponse;

public interface NotificationSendService {

    NotificationResponse send(SendNotificationRequest request);
}

package com.example.notification_service.exception;

import java.util.UUID;

public class NotificationNotFoundException extends ApiException {
    public NotificationNotFoundException(UUID id) {
        super(ErrorCode.NOTIFICATION_NOT_FOUND, "Không tìm thấy thông báo với mã: " + id);
    }
}

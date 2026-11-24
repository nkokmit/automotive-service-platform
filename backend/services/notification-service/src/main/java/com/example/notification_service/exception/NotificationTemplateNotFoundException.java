package com.example.notification_service.exception;

import java.util.UUID;

public class NotificationTemplateNotFoundException extends ApiException {
    public NotificationTemplateNotFoundException(UUID id) {
        super(ErrorCode.NOTIFICATION_TEMPLATE_NOT_FOUND, "Không tìm thấy mẫu thông báo với mã: " + id);
    }
}

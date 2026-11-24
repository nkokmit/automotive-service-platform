package com.example.notification_service.service;

import com.example.notification_service.enums.RecipientType;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public record ResolvedRecipient(
        UUID id,
        UUID userId,
        RecipientType type,
        String fullName,
        String email,
        String phone,
        String licensePlate
) {

    public Map<String, Object> toTemplateVariables() {
        Map<String, Object> variables = new HashMap<>();
        variables.put("recipientId", id);
        variables.put("userId", userId);
        variables.put("fullName", fullName);
        variables.put("email", email);
        variables.put("phone", phone);
        variables.put("licensePlate", licensePlate);
        if (type == RecipientType.CUSTOMER) {
            variables.put("customerName", fullName);
        } else {
            variables.put("staffName", fullName);
        }
        return variables;
    }
}

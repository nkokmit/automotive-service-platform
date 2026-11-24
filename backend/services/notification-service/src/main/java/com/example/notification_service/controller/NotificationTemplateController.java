package com.example.notification_service.controller;

import com.example.notification_service.common.ApiResponse;
import com.example.notification_service.dto.request.UpdateNotificationTemplateRequest;
import com.example.notification_service.dto.response.NotificationTemplateResponse;
import com.example.notification_service.dto.response.PageResponse;
import com.example.notification_service.service.NotificationQueryService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/notification-templates")
public class NotificationTemplateController {

    private final NotificationQueryService queryService;

    public NotificationTemplateController(NotificationQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('NOTIFICATION_TEMPLATE_READ') or hasAuthority('ADMIN')")
    public ApiResponse<PageResponse<NotificationTemplateResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.ASC, "code")
        );
        return ApiResponse.success(queryService.listTemplates(pageable));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('NOTIFICATION_TEMPLATE_WRITE') or hasAuthority('ADMIN')")
    public ApiResponse<NotificationTemplateResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateNotificationTemplateRequest request
    ) {
        return ApiResponse.success(queryService.updateTemplate(id, request));
    }
}

package com.example.notification_service.controller;

import com.example.notification_service.common.ApiResponse;
import com.example.notification_service.dto.request.SendNotificationRequest;
import com.example.notification_service.dto.response.NotificationResponse;
import com.example.notification_service.dto.response.PageResponse;
import com.example.notification_service.dto.response.UnreadCountResponse;
import com.example.notification_service.enums.NotificationCategory;
import com.example.notification_service.exception.ApiException;
import com.example.notification_service.exception.ErrorCode;
import com.example.notification_service.service.NotificationQueryService;
import com.example.notification_service.service.NotificationSendService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationQueryService queryService;
    private final NotificationSendService sendService;

    public NotificationController(
            NotificationQueryService queryService,
            NotificationSendService sendService
    ) {
        this.queryService = queryService;
        this.sendService = sendService;
    }

    @GetMapping("/me")
    public ApiResponse<PageResponse<NotificationResponse>> list(
            @RequestParam(required = false) Boolean isRead,
            @RequestParam(required = false) NotificationCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Jwt jwt
    ) {
        UUID recipientId = currentUserId(jwt);
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return ApiResponse.success(
                queryService.list(recipientId, isRead, category, pageable));
    }

    @GetMapping("/me/unread-count")
    public ApiResponse<UnreadCountResponse> unreadCount(Jwt jwt) {
        return ApiResponse.success(queryService.unreadCount(currentUserId(jwt)));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(Jwt jwt) {
        return queryService.subscribe(currentUserId(jwt));
    }

    @PatchMapping("/{id}/read")
    public ApiResponse<NotificationResponse> markRead(
            @PathVariable UUID id, Jwt jwt) {
        return ApiResponse.success(
                queryService.markRead(id, currentUserId(jwt)));
    }

    @PatchMapping("/me/read-all")
    public ApiResponse<Integer> markAllRead(Jwt jwt) {
        return ApiResponse.success(queryService.markAllRead(currentUserId(jwt)));
    }

    @PostMapping("/send")
    @PreAuthorize("hasAuthority('NOTIFICATION_SEND') or hasAuthority('ADMIN')")
    public ApiResponse<NotificationResponse> send(
            @Valid @RequestBody SendNotificationRequest request) {
        return ApiResponse.success(sendService.send(request));
    }

    private UUID currentUserId(Jwt jwt) {
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            userId = jwt.getSubject();
        }
        if (userId == null || userId.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException exception) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
    }
}

package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.CreateWorkOrderFeedbackRequest;
import com.example.work_order_service.dto.response.FeedbackEligiblePageResponse;
import com.example.work_order_service.dto.response.FeedbackEligibleWorkOrderResponse;
import com.example.work_order_service.dto.response.HomepageReviewResponse;
import com.example.work_order_service.dto.response.HomepageReviewSummaryResponse;
import com.example.work_order_service.dto.response.WorkOrderFeedbackResponse;
import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.entity.WorkOrderFeedback;
import com.example.work_order_service.enums.WorkOrderStatus;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.WorkOrderIntegrationService;
import com.example.work_order_service.repository.CompletedServiceLineProjection;
import com.example.work_order_service.repository.FeedbackAggregateProjection;
import com.example.work_order_service.repository.WorkOrderFeedbackRepository;
import com.example.work_order_service.repository.WorkOrderRepository;
import com.example.work_order_service.repository.WorkOrderServiceLineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkOrderFeedbackServiceImpl implements WorkOrderFeedbackService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_RECENT_REVIEWS = 10;

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderFeedbackRepository feedbackRepository;
    private final WorkOrderServiceLineRepository serviceLineRepository;
    private final WorkOrderIntegrationService integrationService;

    @Override
    @Transactional(readOnly = true)
    public FeedbackEligiblePageResponse getEligibleWorkOrders(Jwt jwt, int page, int size) {
        if (page < 0 || size < 1) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "page phải >= 0 và size phải >= 1");
        }

        UUID customerId = resolveCustomerId(jwt);
        Page<WorkOrder> workOrders = workOrderRepository.findFeedbackEligible(
                customerId,
                WorkOrderStatus.CLOSED,
                PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE)));
        return new FeedbackEligiblePageResponse(
                workOrders.getContent().stream()
                        .map(workOrder -> new FeedbackEligibleWorkOrderResponse(
                                workOrder.getId(), workOrder.getCode()))
                        .toList(),
                workOrders.getNumber(),
                workOrders.getSize(),
                workOrders.getTotalElements(),
                workOrders.getTotalPages());
    }

    @Override
    @Transactional
    public WorkOrderFeedbackResponse submit(
            UUID workOrderId,
            CreateWorkOrderFeedbackRequest request,
            Jwt jwt
    ) {
        UUID customerId = resolveCustomerId(jwt);
        WorkOrder workOrder = workOrderRepository.findByIdForUpdate(workOrderId)
                .orElseThrow(() -> new ApiException(ErrorCode.WORK_ORDER_NOT_FOUND));
        if (!workOrder.getCustomerId().equals(customerId)) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        if (workOrder.getStatus() != WorkOrderStatus.CLOSED) {
            throw new ApiException(ErrorCode.INVALID_WORK_ORDER_STATUS_TRANSITION,
                    "Chỉ có thể đánh giá Work Order đã đóng");
        }
        if (feedbackRepository.existsByWorkOrder_Id(workOrderId)) {
            throw new ApiException(ErrorCode.WORK_ORDER_FEEDBACK_ALREADY_EXISTS);
        }

        String comment = request.comment() == null ? null : request.comment().trim();
        if (comment != null && comment.isEmpty()) {
            comment = null;
        }
        WorkOrderFeedback feedback = WorkOrderFeedback.builder()
                .workOrder(workOrder)
                .customerId(customerId)
                .rating(request.rating())
                .comment(comment)
                .build();
        try {
            return toResponse(feedbackRepository.saveAndFlush(feedback));
        } catch (DataIntegrityViolationException exception) {
            throw new ApiException(ErrorCode.WORK_ORDER_FEEDBACK_ALREADY_EXISTS);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public HomepageReviewSummaryResponse getHomepageSummary(int limit) {
        if (limit < 1 || limit > MAX_RECENT_REVIEWS) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "limit phải nằm trong khoảng 1 đến " + MAX_RECENT_REVIEWS);
        }

        FeedbackAggregateProjection aggregate = feedbackRepository.summarize();
        long reviewCount = aggregate == null || aggregate.getReviewCount() == null
                ? 0 : aggregate.getReviewCount();
        long ratingSum = aggregate == null || aggregate.getRatingSum() == null
                ? 0 : aggregate.getRatingSum();
        BigDecimal averageRating = reviewCount == 0
                ? BigDecimal.ZERO.setScale(2)
                : BigDecimal.valueOf(ratingSum)
                        .divide(BigDecimal.valueOf(reviewCount), 2, RoundingMode.HALF_UP);

        List<WorkOrderFeedback> recentFeedback = feedbackRepository
                .findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(0, limit))
                .getContent();
        Map<UUID, List<String>> completedServicesByWorkOrder =
                loadCompletedServices(recentFeedback);

        List<HomepageReviewResponse> recentReviews = recentFeedback.stream()
                .map(feedback -> new HomepageReviewResponse(
                        feedback.getRating(),
                        feedback.getComment(),
                        feedback.getCreatedAt(),
                        completedServicesByWorkOrder.getOrDefault(
                                feedback.getWorkOrder().getId(), List.of())))
                .toList();
        return new HomepageReviewSummaryResponse(averageRating, reviewCount, recentReviews);
    }

    private Map<UUID, List<String>> loadCompletedServices(List<WorkOrderFeedback> feedback) {
        if (feedback.isEmpty()) {
            return Map.of();
        }
        List<UUID> workOrderIds = feedback.stream()
                .map(item -> item.getWorkOrder().getId())
                .toList();
        Map<UUID, List<String>> serviceNames = new HashMap<>();
        for (CompletedServiceLineProjection line :
                serviceLineRepository.findCompletedSnapshotsByWorkOrderIds(workOrderIds)) {
            serviceNames.computeIfAbsent(line.getWorkOrderId(), ignored -> new ArrayList<>())
                    .add(line.getSnapshotName());
        }
        return serviceNames;
    }

    private UUID resolveCustomerId(Jwt jwt) {
        if (jwt == null) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        Object rawClaim = jwt.getClaims().get("userId");
        if (!(rawClaim instanceof String rawUserId) || rawUserId.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        UUID userId;
        try {
            userId = UUID.fromString(rawUserId);
        } catch (IllegalArgumentException exception) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        return integrationService.getCustomerByUserId(userId).customerId();
    }

    private WorkOrderFeedbackResponse toResponse(WorkOrderFeedback feedback) {
        return new WorkOrderFeedbackResponse(
                feedback.getId(),
                feedback.getWorkOrder().getId(),
                feedback.getRating(),
                feedback.getComment(),
                feedback.getCreatedAt());
    }
}

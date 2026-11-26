package com.example.work_order_service.service;

import com.example.work_order_service.dto.request.CreateWorkOrderFeedbackRequest;
import com.example.work_order_service.dto.response.FeedbackEligiblePageResponse;
import com.example.work_order_service.dto.response.HomepageReviewSummaryResponse;
import com.example.work_order_service.dto.response.WorkOrderFeedbackResponse;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

public interface WorkOrderFeedbackService {

    FeedbackEligiblePageResponse getEligibleWorkOrders(Jwt jwt, int page, int size);

    WorkOrderFeedbackResponse submit(UUID workOrderId, CreateWorkOrderFeedbackRequest request, Jwt jwt);

    HomepageReviewSummaryResponse getHomepageSummary(int limit);
}

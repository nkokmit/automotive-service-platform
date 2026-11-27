package com.example.work_order_service.service;

import com.example.work_order_service.dto.response.AdminFeedbackPageResponse;
import com.example.work_order_service.dto.response.AdminFeedbackResponse;
import com.example.work_order_service.entity.WorkOrderFeedback;
import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.WorkOrderIntegrationService;
import com.example.work_order_service.integration.contract.CustomerSummaryContract;
import com.example.work_order_service.integration.contract.VehicleSummaryContract;
import com.example.work_order_service.repository.CompletedServiceLineProjection;
import com.example.work_order_service.repository.FeedbackAggregateProjection;
import com.example.work_order_service.repository.FeedbackRatingCountProjection;
import com.example.work_order_service.repository.WorkOrderFeedbackRepository;
import com.example.work_order_service.repository.WorkOrderServiceLineRepository;
import lombok.RequiredArgsConstructor;
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
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Triển khai danh sách đánh giá cho màn hình quản trị.
 *
 * <p>Khác với {@link WorkOrderFeedbackServiceImpl} (phía khách hàng), lớp này
 * cần bổ sung thông tin nhận diện từ service khác: tên khách hàng và biển số
 * xe. Vì vậy nó gom các id khách/xe của trang hiện tại rồi tra BATCH (một lần
 * gọi mỗi loại) thay vì gọi từng bản ghi — tránh N+1 request liên service.
 */
@Service
@RequiredArgsConstructor
public class AdminFeedbackServiceImpl implements AdminFeedbackService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MIN_RATING = 1;
    private static final int MAX_RATING = 5;

    private final WorkOrderFeedbackRepository feedbackRepository;
    private final WorkOrderServiceLineRepository serviceLineRepository;
    private final WorkOrderIntegrationService integrationService;

    @Override
    @Transactional(readOnly = true)
    public AdminFeedbackPageResponse list(Integer rating, int page, int size) {
        if (page < 0 || size < 1) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "page phải >= 0 và size phải >= 1");
        }
        if (rating != null && (rating < MIN_RATING || rating > MAX_RATING)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "rating phải nằm trong khoảng " + MIN_RATING + " đến " + MAX_RATING);
        }

        Page<WorkOrderFeedback> feedbacks = feedbackRepository.searchByRating(
                rating,
                rating,
                PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE)));

        List<AdminFeedbackResponse> items = enrich(feedbacks.getContent());

        // Thống kê tổng quan luôn tính trên TOÀN BỘ đánh giá (không phụ thuộc bộ
        // lọc) — admin cần thấy bức tranh toàn cửa hàng, không phải của riêng
        // trang đang xem.
        FeedbackAggregateProjection aggregate = feedbackRepository.summarize();
        long reviewCount = aggregate == null || aggregate.getReviewCount() == null
                ? 0 : aggregate.getReviewCount();
        long ratingSum = aggregate == null || aggregate.getRatingSum() == null
                ? 0 : aggregate.getRatingSum();
        BigDecimal averageRating = reviewCount == 0
                ? BigDecimal.ZERO.setScale(2)
                : BigDecimal.valueOf(ratingSum)
                        .divide(BigDecimal.valueOf(reviewCount), 2, RoundingMode.HALF_UP);

        return new AdminFeedbackPageResponse(
                items,
                feedbacks.getNumber(),
                feedbacks.getSize(),
                feedbacks.getTotalElements(),
                feedbacks.getTotalPages(),
                averageRating,
                buildRatingCounts());
    }

    @Override
    @Transactional
    public boolean delete(UUID feedbackId) {
        // deleteById trả void — kiểm tra tồn tại trước để báo kết quả rõ ràng.
        if (!feedbackRepository.existsById(feedbackId)) {
            return false;
        }
        feedbackRepository.deleteById(feedbackId);
        return true;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Bổ sung tên khách hàng, biển số xe và danh sách dịch vụ đã hoàn thành cho
     * từng đánh giá trong trang.
     */
    private List<AdminFeedbackResponse> enrich(List<WorkOrderFeedback> feedbacks) {
        if (feedbacks.isEmpty()) {
            return List.of();
        }

        Set<UUID> customerIds = feedbacks.stream()
                .map(WorkOrderFeedback::getCustomerId)
                .collect(Collectors.toSet());
        Set<UUID> vehicleIds = feedbacks.stream()
                .map(feedback -> feedback.getWorkOrder().getVehicleId())
                .collect(Collectors.toSet());

        // Tra batch — một lần gọi cho tất cả khách, một lần cho tất cả xe.
        Map<UUID, CustomerSummaryContract> customers =
                integrationService.getCustomersBatch(customerIds);
        Map<UUID, VehicleSummaryContract> vehicles =
                integrationService.getVehiclesBatch(vehicleIds);

        Map<UUID, List<String>> completedServices = loadCompletedServices(feedbacks);

        List<AdminFeedbackResponse> items = new ArrayList<>(feedbacks.size());
        for (WorkOrderFeedback feedback : feedbacks) {
            CustomerSummaryContract customer = customers.get(feedback.getCustomerId());
            VehicleSummaryContract vehicle = vehicles.get(feedback.getWorkOrder().getVehicleId());
            items.add(new AdminFeedbackResponse(
                    feedback.getId(),
                    feedback.getWorkOrder().getId(),
                    feedback.getWorkOrder().getCode(),
                    feedback.getCustomerId(),
                    customer == null ? null : customer.fullName(),
                    customer == null ? null : customer.phone(),
                    vehicle == null ? null : vehicle.licensePlate(),
                    feedback.getRating(),
                    feedback.getComment(),
                    completedServices.getOrDefault(feedback.getWorkOrder().getId(), List.of()),
                    feedback.getCreatedAt()));
        }
        return items;
    }

    private Map<UUID, List<String>> loadCompletedServices(List<WorkOrderFeedback> feedbacks) {
        List<UUID> workOrderIds = feedbacks.stream()
                .map(feedback -> feedback.getWorkOrder().getId())
                .toList();
        Map<UUID, List<String>> serviceNames = new HashMap<>();
        for (CompletedServiceLineProjection line :
                serviceLineRepository.findCompletedSnapshotsByWorkOrderIds(workOrderIds)) {
            serviceNames.computeIfAbsent(line.getWorkOrderId(), ignored -> new ArrayList<>())
                    .add(line.getSnapshotName());
        }
        return serviceNames;
    }

    /**
     * Phân bố đánh giá theo mức sao, luôn trả về đúng 5 phần tử (mức sao 5 → 1).
     *
     * <p>Mức sao không có đánh giá được điền 0 để frontend không phải tự suy
     * luận phần tử thiếu là 0.
     */
    private List<Integer> buildRatingCounts() {
        Map<Integer, Long> counts = new HashMap<>();
        for (FeedbackRatingCountProjection projection : feedbackRepository.countByRating()) {
            counts.put(projection.getRating(), projection.getRatingCount());
        }
        List<Integer> result = new ArrayList<>(MAX_RATING);
        for (int star = MAX_RATING; star >= MIN_RATING; star--) {
            result.add(counts.getOrDefault(star, 0L).intValue());
        }
        return result;
    }
}

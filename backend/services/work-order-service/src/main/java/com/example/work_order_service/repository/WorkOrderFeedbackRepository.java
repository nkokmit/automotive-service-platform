package com.example.work_order_service.repository;

import com.example.work_order_service.entity.WorkOrderFeedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkOrderFeedbackRepository extends JpaRepository<WorkOrderFeedback, UUID> {

    Optional<WorkOrderFeedback> findByWorkOrder_Id(UUID workOrderId);

    boolean existsByWorkOrder_Id(UUID workOrderId);

    Page<WorkOrderFeedback> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

    @Query("""
            select sum(feedback.rating) as ratingSum, count(feedback) as reviewCount
            from WorkOrderFeedback feedback
            """)
    FeedbackAggregateProjection summarize();

    /**
     * Tìm đánh giá theo mức sao, dùng cho bộ lọc của màn hình quản trị.
     *
     * <p>{@code minRating} / {@code maxRating} cho phép lọc theo khoảng sao.
     * Khi truyền {@code null} thì bỏ qua điều kiện tương ứng.
     */
    @Query("""
            select feedback from WorkOrderFeedback feedback
            where (:minRating is null or feedback.rating >= :minRating)
              and (:maxRating is null or feedback.rating <= :maxRating)
            order by feedback.createdAt desc, feedback.id desc
            """)
    Page<WorkOrderFeedback> searchByRating(
            @Param("minRating") Integer minRating,
            @Param("maxRating") Integer maxRating,
            Pageable pageable);

    /**
     * Đếm số đánh giá theo từng mức sao (1..5).
     *
     * <p>Trả về một projection cho mỗi mức sao ĐANG CÓ đánh giá — mức sao
     * không có bản ghi sẽ không xuất hiện trong kết quả (service tự điền 0).
     */
    @Query("""
            select feedback.rating as rating, count(feedback) as ratingCount
            from WorkOrderFeedback feedback
            group by feedback.rating
            order by feedback.rating desc
            """)
    List<FeedbackRatingCountProjection> countByRating();
}

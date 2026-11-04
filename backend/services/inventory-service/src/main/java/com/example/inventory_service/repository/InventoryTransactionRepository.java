package com.example.inventory_service.repository;

import com.example.inventory_service.entity.InventoryTransaction;
import com.example.inventory_service.enums.ReferenceType;
import com.example.inventory_service.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

/**
 * Sổ nhật ký kho, chỉ ghi thêm (append-only). Trạng thái giữ chỗ được suy ra
 * bằng truy vấn tổng hợp theo (reference_type, reference_id, part_id).
 */
@Repository
public interface InventoryTransactionRepository
        extends JpaRepository<InventoryTransaction, UUID> {

    @Query("""
            SELECT t FROM InventoryTransaction t
            WHERE (:partId IS NULL OR t.part.id = :partId)
              AND (:type IS NULL OR t.type = :type)
              AND (:referenceType IS NULL OR t.referenceType = :referenceType)
              AND (:referenceId IS NULL OR t.referenceId = :referenceId)
              AND (:fromDate IS NULL OR t.createdAt >= :fromDate)
              AND (:toDate IS NULL OR t.createdAt <= :toDate)
            """)
    Page<InventoryTransaction> search(@Param("partId") UUID partId,
                                      @Param("type") TransactionType type,
                                      @Param("referenceType") ReferenceType referenceType,
                                      @Param("referenceId") UUID referenceId,
                                      @Param("fromDate") Instant fromDate,
                                      @Param("toDate") Instant toDate,
                                      Pageable pageable);

    /**
     * Số lượng còn giữ chỗ của một phụ tùng theo một tham chiếu:
     * SUM(RESERVE) - SUM(RELEASE) - SUM(EXPORT).
     *
     * <p>Dùng cho issue/release để không xuất hoặc giải phóng nhiều hơn số đã giữ.
     */
    @Query("""
            SELECT COALESCE(SUM(CASE WHEN t.type = com.example.inventory_service.enums.TransactionType.RESERVE
                                     THEN t.quantity ELSE -t.quantity END), 0)
            FROM InventoryTransaction t
            WHERE t.part.id = :partId
              AND t.referenceType = :referenceType
              AND t.referenceId = :referenceId
              AND t.type IN (com.example.inventory_service.enums.TransactionType.RESERVE,
                             com.example.inventory_service.enums.TransactionType.RELEASE,
                             com.example.inventory_service.enums.TransactionType.EXPORT)
            """)
    long sumOutstandingReservation(@Param("partId") UUID partId,
                                   @Param("referenceType") ReferenceType referenceType,
                                   @Param("referenceId") UUID referenceId);
}

package com.example.inventory_service.repository;

import com.example.inventory_service.entity.PurchaseOrder;
import com.example.inventory_service.enums.PurchaseOrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    /**
     * Khóa ghi đơn nhập hàng khi chuyển trạng thái, để hai request đồng thời
     * (ví dụ hai lần complete) không cùng nhập kho một đơn.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT po FROM PurchaseOrder po WHERE po.id = :id")
    Optional<PurchaseOrder> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
            SELECT po FROM PurchaseOrder po
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(po.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(po.supplier.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:status IS NULL OR po.status = :status)
              AND (:supplierId IS NULL OR po.supplier.id = :supplierId)
            """)
    Page<PurchaseOrder> search(@Param("keyword") String keyword,
                               @Param("status") PurchaseOrderStatus status,
                               @Param("supplierId") UUID supplierId,
                               Pageable pageable);
}

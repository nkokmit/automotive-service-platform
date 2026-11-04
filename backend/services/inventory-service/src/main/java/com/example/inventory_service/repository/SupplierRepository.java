package com.example.inventory_service.repository;

import com.example.inventory_service.entity.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    @Query("""
            SELECT sup FROM Supplier sup
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(sup.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(sup.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(sup.phone) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:isActive IS NULL OR sup.isActive = :isActive)
            """)
    Page<Supplier> search(@Param("keyword") String keyword,
                           @Param("isActive") Boolean isActive,
                           Pageable pageable);

    /**
     * Đếm số đơn nhập hàng của nhà cung cấp - dùng để chặn xóa nhà cung cấp
     * khi còn đơn (FK {@code fk_po_supplier} là {@code ON DELETE RESTRICT}).
     */
    @Query("SELECT COUNT(po) FROM PurchaseOrder po WHERE po.supplier.id = :supplierId")
    long countPurchaseOrdersBySupplierId(@Param("supplierId") UUID supplierId);
}

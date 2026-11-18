package com.example.billing_service.repository;

import com.example.billing_service.entity.Invoice;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByWorkOrderId(UUID workOrderId);

    @Query("""
            select invoice from Invoice invoice
            where (:status is null or invoice.status = :status)
              and (:customerId is null or invoice.customerId = :customerId)
              and (:from is null or invoice.issuedAt >= :from)
              and (:to is null or invoice.issuedAt <= :to)
            """)
    Page<Invoice> search(
            @Param("status") com.example.billing_service.enums.InvoiceStatus status,
            @Param("customerId") UUID customerId,
            @Param("from") java.time.Instant from,
            @Param("to") java.time.Instant to,
            Pageable pageable
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select invoice from Invoice invoice where invoice.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select invoice from Invoice invoice where invoice.workOrderId = :workOrderId")
    Optional<Invoice> findByWorkOrderIdForUpdate(@Param("workOrderId") UUID workOrderId);
}

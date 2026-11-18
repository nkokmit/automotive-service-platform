package com.example.billing_service.repository;

import com.example.billing_service.entity.InvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, UUID> {

    List<InvoiceItem> findAllByInvoice_Id(UUID invoiceId);
}

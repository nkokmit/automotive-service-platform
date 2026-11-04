package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.enums.ReferenceType;
import com.example.inventory_service.enums.TransactionType;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.UUID;

public interface InventoryTransactionService {

    PageResponse<InventoryTransactionResponse> getTransactions(UUID partId,
                                                               TransactionType type,
                                                               ReferenceType referenceType,
                                                               UUID referenceId,
                                                               Instant fromDate,
                                                               Instant toDate,
                                                               Pageable pageable);
}

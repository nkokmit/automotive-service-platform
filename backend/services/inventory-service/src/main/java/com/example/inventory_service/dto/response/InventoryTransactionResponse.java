package com.example.inventory_service.dto.response;

import com.example.inventory_service.enums.ReferenceType;
import com.example.inventory_service.enums.TransactionType;

import java.time.Instant;
import java.util.UUID;

/**
 * {@code stockBefore}/{@code stockAfter} là tồn thực (on_hand) với
 * IMPORT/EXPORT/RETURN/ADJUSTMENT và là tồn giữ chỗ (reserved) với
 * RESERVE/RELEASE.
 */
public record InventoryTransactionResponse(
        UUID id,
        UUID partId,
        String partSku,
        String partName,
        TransactionType type,
        Integer quantity,
        Integer stockBefore,
        Integer stockAfter,
        ReferenceType referenceType,
        UUID referenceId,
        UUID createdBy,
        String note,
        Instant createdAt
) {
}

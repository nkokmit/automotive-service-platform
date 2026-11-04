package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.enums.ReferenceType;
import com.example.inventory_service.enums.TransactionType;
import com.example.inventory_service.exception.ApiException;
import com.example.inventory_service.exception.ErrorCode;
import com.example.inventory_service.mapper.InventoryTransactionMapper;
import com.example.inventory_service.repository.InventoryTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryTransactionServiceImpl implements InventoryTransactionService {

    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final InventoryTransactionMapper inventoryTransactionMapper;

    @Override
    public PageResponse<InventoryTransactionResponse> getTransactions(UUID partId,
                                                                      TransactionType type,
                                                                      ReferenceType referenceType,
                                                                      UUID referenceId,
                                                                      Instant fromDate,
                                                                      Instant toDate,
                                                                      Pageable pageable) {
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "fromDate phải trước hoặc bằng toDate");
        }
        return PageResponse.from(
                inventoryTransactionRepository.search(partId, type, referenceType, referenceId,
                        fromDate, toDate, pageable),
                inventoryTransactionMapper::toResponse);
    }
}

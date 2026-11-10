package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.InternalPartStockCommand;
import com.example.inventory_service.dto.request.StockItemRequest;
import com.example.inventory_service.dto.request.StockOperationRequest;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.exception.ApiException;
import com.example.inventory_service.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InternalPartStockCommandService {

    private final StockService stockService;

    public InventoryTransactionResponse issue(InternalPartStockCommand command) {
        return execute(command, true);
    }

    public InventoryTransactionResponse release(InternalPartStockCommand command) {
        return execute(command, false);
    }

    private InventoryTransactionResponse execute(
            InternalPartStockCommand command, boolean issue
    ) {
        if (command == null || command.workOrderId() == null
                || command.partId() == null || command.quantity() == null || command.quantity() <= 0
                || command.requestedBy() == null || command.idempotencyKey() == null
                || command.idempotencyKey().isBlank()) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "Lệnh kho nội bộ thiếu dữ liệu hợp lệ");
        }
        StockOperationRequest stockRequest = new StockOperationRequest(
                command.workOrderId(),
                List.of(new StockItemRequest(command.partId(), command.quantity())),
                "Work Order part issue/release");
        List<InventoryTransactionResponse> result = issue
                ? stockService.issue(stockRequest, command.requestedBy(), command.idempotencyKey())
                : stockService.release(stockRequest, command.requestedBy(), command.idempotencyKey());
        if (result.size() != 1) {
            throw new ApiException(ErrorCode.UNCATEGORIZED_EXCEPTION,
                    "Inventory Service không tạo đúng một giao dịch kho cho lệnh nội bộ");
        }
        return result.getFirst();
    }
}

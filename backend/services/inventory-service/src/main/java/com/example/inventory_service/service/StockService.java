package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.StockAdjustmentRequest;
import com.example.inventory_service.dto.request.StockOperationRequest;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.dto.response.PartResponse;

import java.util.List;
import java.util.UUID;

/**
 * Biến động tồn kho theo Work Order. Mỗi thao tác chạy trong một transaction,
 * khóa các dòng {@code parts} theo thứ tự id tăng dần và ghi sổ kho.
 */
public interface StockService {

    /** Tăng {@code reserved_stock}; yêu cầu {@code on_hand - reserved >= quantity}. */
    List<InventoryTransactionResponse> reserve(StockOperationRequest request);

    /** Giữ chỗ thay mặt user đã phê duyệt Estimate trong Work Order Service. */
    List<InventoryTransactionResponse> reserve(StockOperationRequest request, UUID actorId);

    /** Giảm {@code on_hand} và {@code reserved}; số lượng không vượt phần còn giữ chỗ. */
    List<InventoryTransactionResponse> issue(StockOperationRequest request);

    /** Synchronous Work Order issue command with durable idempotency. */
    List<InventoryTransactionResponse> issue(
            StockOperationRequest request, UUID actorId, String idempotencyKey);

    /** Giảm {@code reserved}; số lượng không vượt phần còn giữ chỗ. */
    List<InventoryTransactionResponse> release(StockOperationRequest request);

    /** Synchronous Work Order release command with durable idempotency. */
    List<InventoryTransactionResponse> release(
            StockOperationRequest request, UUID actorId, String idempotencyKey);

    /**
     * Nhập / hiệu chỉnh tồn kho thủ công cho một phụ tùng.
     *
     * <p>Mode {@code ADD}: cộng thêm {@code quantity} vào tồn thực (ghi {@code IMPORT}).
     * Mode {@code SET}: đặt tồn thực bằng đúng {@code quantity} (ghi {@code ADJUSTMENT}).
     * Cả hai đều ghi một dòng vào sổ kho {@code inventory_transactions}.
     */
    PartResponse adjustStock(UUID partId, StockAdjustmentRequest request);
}

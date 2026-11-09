package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.StockOperationRequest;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;

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

    /** Giảm {@code reserved}; số lượng không vượt phần còn giữ chỗ. */
    List<InventoryTransactionResponse> release(StockOperationRequest request);
}

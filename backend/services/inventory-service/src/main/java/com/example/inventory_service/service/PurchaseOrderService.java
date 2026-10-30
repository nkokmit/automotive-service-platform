package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.dto.request.PurchaseOrderRequest;
import com.example.inventory_service.dto.response.PurchaseOrderResponse;
import com.example.inventory_service.enums.PurchaseOrderStatus;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface PurchaseOrderService {

    PageResponse<PurchaseOrderResponse> getPurchaseOrders(String keyword,
                                                          PurchaseOrderStatus status,
                                                          UUID supplierId,
                                                          Pageable pageable);

    PurchaseOrderResponse getPurchaseOrderById(UUID id);

    PurchaseOrderResponse createPurchaseOrder(PurchaseOrderRequest request);

    /** Chỉ khi đơn đang {@code DRAFT}. */
    PurchaseOrderResponse updatePurchaseOrder(UUID id, PurchaseOrderRequest request);

    /** {@code DRAFT -> APPROVED}. */
    PurchaseOrderResponse approve(UUID id);

    /** {@code APPROVED -> RECEIVED}, đồng thời nhập kho và ghi sổ kho. */
    PurchaseOrderResponse complete(UUID id);

    /** {@code DRAFT/APPROVED -> CANCELED}. */
    PurchaseOrderResponse cancel(UUID id);
}

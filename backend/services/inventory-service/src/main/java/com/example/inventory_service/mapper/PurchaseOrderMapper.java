package com.example.inventory_service.mapper;

import com.example.inventory_service.dto.response.PurchaseOrderItemResponse;
import com.example.inventory_service.dto.response.PurchaseOrderResponse;
import com.example.inventory_service.entity.PurchaseOrder;
import com.example.inventory_service.entity.PurchaseOrderItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface PurchaseOrderMapper {

    @Mapping(target = "partId", source = "part.id")
    @Mapping(target = "partSku", source = "part.sku")
    @Mapping(target = "partName", source = "part.name")
    PurchaseOrderItemResponse toItemResponse(PurchaseOrderItem item);

    /**
     * Danh sách đơn không kèm dòng hàng, tránh truy vấn N+1 khi liệt kê.
     */
    default PurchaseOrderResponse toSummary(PurchaseOrder po) {
        return toResponse(po, List.of());
    }

    default PurchaseOrderResponse toResponse(PurchaseOrder po, List<PurchaseOrderItem> items) {
        return new PurchaseOrderResponse(
                po.getId(),
                po.getCode(),
                po.getSupplier().getId(),
                po.getSupplier().getName(),
                po.getStatus(),
                po.getTotalAmount(),
                po.getCreatedBy(),
                po.getReceivedAt(),
                po.getNote(),
                po.getCreatedAt(),
                po.getUpdatedAt(),
                items.stream().map(this::toItemResponse).toList());
    }
}

package com.example.inventory_service.service;

import com.example.inventory_service.common.PageResponse;
import com.example.inventory_service.common.TextUtils;
import com.example.inventory_service.dto.request.PurchaseOrderRequest;
import com.example.inventory_service.dto.response.PurchaseOrderResponse;
import com.example.inventory_service.entity.PurchaseOrder;
import com.example.inventory_service.entity.Supplier;
import com.example.inventory_service.enums.PurchaseOrderStatus;
import com.example.inventory_service.exception.PurchaseOrderAlreadyExistsException;
import com.example.inventory_service.mapper.PurchaseOrderMapper;
import com.example.inventory_service.repository.InventoryTransactionRepository;
import com.example.inventory_service.repository.PartRepository;
import com.example.inventory_service.repository.PurchaseOrderItemRepository;
import com.example.inventory_service.repository.PurchaseOrderRepository;
import com.example.inventory_service.repository.SupplierRepository;
import com.example.inventory_service.security.CurrentActorIdProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;
import com.example.inventory_service.dto.request.PurchaseOrderItemRequest;
import com.example.inventory_service.entity.InventoryTransaction;
import com.example.inventory_service.entity.Part;
import com.example.inventory_service.entity.PurchaseOrderItem;
import com.example.inventory_service.enums.ReferenceType;
import com.example.inventory_service.enums.TransactionType;
import com.example.inventory_service.exception.ApiException;
import com.example.inventory_service.exception.ErrorCode;
import com.example.inventory_service.exception.InvalidPurchaseOrderStatusException;
import com.example.inventory_service.exception.PartNotFoundException;
import com.example.inventory_service.exception.PurchaseOrderNotFoundException;
import com.example.inventory_service.exception.SupplierNotFoundException;

import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PurchaseOrderServiceImpl implements PurchaseOrderService {

    private static final DateTimeFormatter CODE_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository itemRepository;
    private final SupplierRepository supplierRepository;
    private final PartRepository partRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final CurrentActorIdProvider currentActorIdProvider;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PurchaseOrderResponse> getPurchaseOrders(String keyword,
                                                                 PurchaseOrderStatus status,
                                                                 UUID supplierId,
                                                                 Pageable pageable) {
        return PageResponse.from(
                purchaseOrderRepository.search(TextUtils.trimToNull(keyword), status, supplierId, pageable),
                purchaseOrderMapper::toSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public PurchaseOrderResponse getPurchaseOrderById(UUID id) {
        return toDetail(findPurchaseOrder(id));
    }

    @Override
    public PurchaseOrderResponse createPurchaseOrder(PurchaseOrderRequest request) {
        UUID actorId = currentActorIdProvider.requireCurrentUserId();
        Supplier supplier = findActiveSupplier(request.supplierId());
        String code = TextUtils.trimToNull(request.code());
        if (code == null) {
            code = generateCode();
        } else if (purchaseOrderRepository.existsByCodeIgnoreCase(code)) {
            throw new PurchaseOrderAlreadyExistsException("Mã đơn nhập hàng đã tồn tại: " + code);
        }

        PurchaseOrder saved = purchaseOrderRepository.save(PurchaseOrder.builder()
                .code(code)
                .supplier(supplier)
                .status(PurchaseOrderStatus.DRAFT)
                .totalAmount(BigDecimal.ZERO)
                .createdBy(actorId)
                .note(TextUtils.trimToNull(request.note()))
                .build());
        replaceItems(saved, request.items());
        log.info("Đã tạo đơn nhập hàng: code={}", saved.getCode());
        return toDetail(saved);
    }

    @Override
    public PurchaseOrderResponse updatePurchaseOrder(UUID id, PurchaseOrderRequest request) {
        PurchaseOrder po = lockPurchaseOrder(id);
        requireStatus(po, PurchaseOrderStatus.DRAFT, "Chỉ được sửa đơn nhập hàng ở trạng thái DRAFT");

        String code = TextUtils.trimToNull(request.code());
        if (code != null && !code.equalsIgnoreCase(po.getCode())) {
            if (purchaseOrderRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
                throw new PurchaseOrderAlreadyExistsException("Mã đơn nhập hàng đã tồn tại: " + code);
            }
            po.setCode(code);
        }
        if (!po.getSupplier().getId().equals(request.supplierId())) {
            po.setSupplier(findActiveSupplier(request.supplierId()));
        }
        po.setNote(TextUtils.trimToNull(request.note()));
        itemRepository.deleteAll(itemRepository.findByPurchaseOrderIdOrderById(id));
        itemRepository.flush();
        replaceItems(po, request.items());
        log.info("Đã cập nhật đơn nhập hàng: id={}", id);
        return toDetail(po);
    }

    @Override
    public PurchaseOrderResponse approve(UUID id) {
        PurchaseOrder po = lockPurchaseOrder(id);
        requireStatus(po, PurchaseOrderStatus.DRAFT, "Chỉ được duyệt đơn nhập hàng ở trạng thái DRAFT");
        if (itemRepository.findByPurchaseOrderIdOrderById(id).isEmpty()) {
            throw new ApiException(ErrorCode.PURCHASE_ORDER_EMPTY, ErrorCode.PURCHASE_ORDER_EMPTY.getMessage());
        }
        po.setStatus(PurchaseOrderStatus.APPROVED);
        purchaseOrderRepository.save(po);
        log.info("Đã duyệt đơn nhập hàng: id={}", id);
        return toDetail(po);
    }

    /**
     * Nhập kho trong một transaction: khóa đơn, khóa các dòng {@code parts}
     * theo id tăng dần, tăng {@code on_hand_stock}, tính lại giá vốn bình quân
     * gia quyền và ghi một dòng {@code IMPORT} cho mỗi mặt hàng.
     */
    @Override
    public PurchaseOrderResponse complete(UUID id) {
        UUID actorId = currentActorIdProvider.requireCurrentUserId();
        PurchaseOrder po = lockPurchaseOrder(id);
        requireStatus(po, PurchaseOrderStatus.APPROVED, "Chỉ được nhập kho đơn đã duyệt (APPROVED)");

        List<PurchaseOrderItem> items = new ArrayList<>(itemRepository.findByPurchaseOrderIdOrderById(id));
        if (items.isEmpty()) {
            throw new ApiException(ErrorCode.PURCHASE_ORDER_EMPTY, ErrorCode.PURCHASE_ORDER_EMPTY.getMessage());
        }
        items.sort(Comparator.comparing(item -> item.getPart().getId()));

        List<Part> parts = new ArrayList<>();
        List<InventoryTransaction> ledger = new ArrayList<>();
        for (PurchaseOrderItem item : items) {
            UUID partId = item.getPart().getId();
            Part part = partRepository.findByIdForUpdate(partId)
                    .orElseThrow(() -> new PartNotFoundException("Không tìm thấy phụ tùng với id: " + partId));
            int quantity = item.getQuantity();
            int before = part.getOnHandStock();
            int after = before + quantity;

            BigDecimal currentValue = part.getCostPrice().multiply(BigDecimal.valueOf(before));
            BigDecimal importValue = item.getImportPrice().multiply(BigDecimal.valueOf(quantity));
            part.setCostPrice(currentValue.add(importValue)
                    .divide(BigDecimal.valueOf(after), 2, RoundingMode.HALF_UP));
            part.setOnHandStock(after);
            parts.add(part);

            ledger.add(InventoryTransaction.builder()
                    .part(part)
                    .type(TransactionType.IMPORT)
                    .quantity(quantity)
                    .stockBefore(before)
                    .stockAfter(after)
                    .referenceType(ReferenceType.PURCHASE_ORDER)
                    .referenceId(po.getId())
                    .createdBy(actorId)
                    .note("Nhập kho theo đơn " + po.getCode())
                    .build());
        }
        partRepository.saveAll(parts);
        inventoryTransactionRepository.saveAll(ledger);

        po.setStatus(PurchaseOrderStatus.RECEIVED);
        po.setReceivedAt(Instant.now());
        purchaseOrderRepository.save(po);
        log.info("Đã nhập kho đơn nhập hàng: id={}, items={}", id, items.size());
        return toDetail(po);
    }

    @Override
    public PurchaseOrderResponse cancel(UUID id) {
        PurchaseOrder po = lockPurchaseOrder(id);
        if (po.getStatus() != PurchaseOrderStatus.DRAFT && po.getStatus() != PurchaseOrderStatus.APPROVED) {
            throw new InvalidPurchaseOrderStatusException(
                    "Chỉ được hủy đơn ở trạng thái DRAFT hoặc APPROVED, hiện tại: " + po.getStatus());
        }
        po.setStatus(PurchaseOrderStatus.CANCELED);
        purchaseOrderRepository.save(po);
        log.info("Đã hủy đơn nhập hàng: id={}", id);
        return toDetail(po);
    }

    /**
     * Ghi các dòng hàng và cập nhật {@code total_amount}. Mỗi phụ tùng chỉ được
     * xuất hiện một lần trong đơn.
     */
    private void replaceItems(PurchaseOrder po, List<PurchaseOrderItemRequest> requests) {
        Set<UUID> seen = new HashSet<>();
        List<PurchaseOrderItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (PurchaseOrderItemRequest request : requests) {
            if (!seen.add(request.partId())) {
                throw new ApiException(ErrorCode.INVALID_REQUEST,
                        "Phụ tùng xuất hiện nhiều lần trong đơn: " + request.partId());
            }
            Part part = partRepository.findById(request.partId())
                    .orElseThrow(() -> new PartNotFoundException(
                            "Không tìm thấy phụ tùng với id: " + request.partId()));
            BigDecimal lineTotal = request.importPrice().multiply(BigDecimal.valueOf(request.quantity()));
            total = total.add(lineTotal);
            items.add(PurchaseOrderItem.builder()
                    .purchaseOrder(po)
                    .part(part)
                    .quantity(request.quantity())
                    .importPrice(request.importPrice())
                    .totalPrice(lineTotal)
                    .build());
        }
        itemRepository.saveAll(items);
        po.setTotalAmount(total);
        purchaseOrderRepository.save(po);
    }

    private PurchaseOrderResponse toDetail(PurchaseOrder po) {
        return purchaseOrderMapper.toResponse(po, itemRepository.findByPurchaseOrderIdOrderById(po.getId()));
    }

    private PurchaseOrder findPurchaseOrder(UUID id) {
        return purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new PurchaseOrderNotFoundException("Không tìm thấy đơn nhập hàng với id: " + id));
    }

    private PurchaseOrder lockPurchaseOrder(UUID id) {
        return purchaseOrderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new PurchaseOrderNotFoundException("Không tìm thấy đơn nhập hàng với id: " + id));
    }

    private Supplier findActiveSupplier(UUID id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new SupplierNotFoundException("Không tìm thấy nhà cung cấp với id: " + id));
        if (!Boolean.TRUE.equals(supplier.getIsActive())) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "Nhà cung cấp đã ngừng hoạt động: " + supplier.getCode());
        }
        return supplier;
    }

    private void requireStatus(PurchaseOrder po, PurchaseOrderStatus expected, String message) {
        if (po.getStatus() != expected) {
            throw new InvalidPurchaseOrderStatusException(message + ", hiện tại: " + po.getStatus());
        }
    }

    private String generateCode() {
        String code;
        do {
            code = "PO-" + LocalDateTime.now().format(CODE_TIME) + "-"
                    + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        } while (purchaseOrderRepository.existsByCodeIgnoreCase(code));
        return code;
    }
}

package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.StockItemRequest;
import com.example.inventory_service.dto.request.StockOperationRequest;
import com.example.inventory_service.dto.response.InventoryTransactionResponse;
import com.example.inventory_service.entity.InventoryTransaction;
import com.example.inventory_service.entity.Part;
import com.example.inventory_service.enums.ReferenceType;
import com.example.inventory_service.enums.TransactionType;
import com.example.inventory_service.exception.ApiException;
import com.example.inventory_service.exception.ErrorCode;
import com.example.inventory_service.exception.InsufficientStockException;
import com.example.inventory_service.exception.PartNotFoundException;
import com.example.inventory_service.exception.ReservationNotFoundException;
import com.example.inventory_service.mapper.InventoryTransactionMapper;
import com.example.inventory_service.repository.InventoryTransactionRepository;
import com.example.inventory_service.repository.PartRepository;
import com.example.inventory_service.security.CurrentActorIdProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * Giữ chỗ, xuất kho và giải phóng tồn kho theo Work Order.
 *
 * <p>Thứ tự trong mỗi thao tác:
 * <ol>
 *   <li>Gộp số lượng theo {@code partId}, sắp xếp tăng dần theo id. Hai request
 *       cùng chạm nhiều phụ tùng luôn khóa theo cùng thứ tự nên không deadlock.</li>
 *   <li>Khóa tất cả dòng {@code parts} ({@code SELECT ... FOR UPDATE}) trước khi
 *       đọc sổ kho, để tổng giữ chỗ đọc được phản ánh các giao dịch đã commit.</li>
 *   <li>Kiểm tra điều kiện, cập nhật tồn và ghi sổ kho.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StockServiceImpl implements StockService {

    private final PartRepository partRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final InventoryTransactionMapper inventoryTransactionMapper;
    private final CurrentActorIdProvider currentActorIdProvider;

    @Override
    public List<InventoryTransactionResponse> reserve(StockOperationRequest request) {
        UUID actorId = currentActorIdProvider.requireCurrentUserId();
        Map<UUID, Integer> quantities = mergeQuantities(request);
        Map<UUID, Part> parts = lockParts(quantities);

        List<InventoryTransaction> ledger = new ArrayList<>();
        for (Map.Entry<UUID, Integer> entry : quantities.entrySet()) {
            Part part = parts.get(entry.getKey());
            int quantity = entry.getValue();
            if (!Boolean.TRUE.equals(part.getIsActive())) {
                throw new ApiException(ErrorCode.INVALID_REQUEST,
                        "Phụ tùng đã ngừng hoạt động: " + part.getSku());
            }
            int available = part.getOnHandStock() - part.getReservedStock();
            if (quantity > available) {
                throw new InsufficientStockException("Không đủ tồn kho cho phụ tùng " + part.getSku()
                        + ": cần " + quantity + ", khả dụng " + available);
            }
            int before = part.getReservedStock();
            part.setReservedStock(before + quantity);
            ledger.add(newTransaction(part, TransactionType.RESERVE, quantity, before, before + quantity,
                    request, actorId));
        }
        return save(parts, ledger, "giữ chỗ", request.referenceId());
    }

    @Override
    public List<InventoryTransactionResponse> issue(StockOperationRequest request) {
        UUID actorId = currentActorIdProvider.requireCurrentUserId();
        Map<UUID, Integer> quantities = mergeQuantities(request);
        Map<UUID, Part> parts = lockParts(quantities);

        List<InventoryTransaction> ledger = new ArrayList<>();
        for (Map.Entry<UUID, Integer> entry : quantities.entrySet()) {
            Part part = parts.get(entry.getKey());
            int quantity = entry.getValue();
            requireOutstanding(part, quantity, request.referenceId());
            if (part.getOnHandStock() < quantity || part.getReservedStock() < quantity) {
                throw new InsufficientStockException("Tồn kho không đủ để xuất phụ tùng " + part.getSku());
            }
            int before = part.getOnHandStock();
            part.setOnHandStock(before - quantity);
            part.setReservedStock(part.getReservedStock() - quantity);
            ledger.add(newTransaction(part, TransactionType.EXPORT, quantity, before, before - quantity,
                    request, actorId));
        }
        return save(parts, ledger, "xuất kho", request.referenceId());
    }

    @Override
    public List<InventoryTransactionResponse> release(StockOperationRequest request) {
        UUID actorId = currentActorIdProvider.requireCurrentUserId();
        Map<UUID, Integer> quantities = mergeQuantities(request);
        Map<UUID, Part> parts = lockParts(quantities);

        List<InventoryTransaction> ledger = new ArrayList<>();
        for (Map.Entry<UUID, Integer> entry : quantities.entrySet()) {
            Part part = parts.get(entry.getKey());
            int quantity = entry.getValue();
            requireOutstanding(part, quantity, request.referenceId());
            if (part.getReservedStock() < quantity) {
                throw new InsufficientStockException(
                        "Tồn giữ chỗ không đủ để giải phóng phụ tùng " + part.getSku());
            }
            int before = part.getReservedStock();
            part.setReservedStock(before - quantity);
            ledger.add(newTransaction(part, TransactionType.RELEASE, quantity, before, before - quantity,
                    request, actorId));
        }
        return save(parts, ledger, "giải phóng giữ chỗ", request.referenceId());
    }

    /**
     * Gộp các dòng trùng {@code partId}; {@link TreeMap} giữ thứ tự id tăng dần.
     */
    private Map<UUID, Integer> mergeQuantities(StockOperationRequest request) {
        Map<UUID, Integer> quantities = new TreeMap<>();
        for (StockItemRequest item : request.items()) {
            quantities.merge(item.partId(), item.quantity(), Integer::sum);
        }
        return quantities;
    }

    private Map<UUID, Part> lockParts(Map<UUID, Integer> quantities) {
        Map<UUID, Part> parts = new TreeMap<>();
        for (UUID partId : quantities.keySet()) {
            Part part = partRepository.findByIdForUpdate(partId)
                    .orElseThrow(() -> new PartNotFoundException("Không tìm thấy phụ tùng với id: " + partId));
            parts.put(partId, part);
        }
        return parts;
    }

    private void requireOutstanding(Part part, int quantity, UUID referenceId) {
        long outstanding = inventoryTransactionRepository.sumOutstandingReservation(
                part.getId(), ReferenceType.WORK_ORDER, referenceId);
        if (quantity > outstanding) {
            throw new ReservationNotFoundException("Work Order " + referenceId + " chỉ còn giữ chỗ "
                    + outstanding + " cho phụ tùng " + part.getSku() + ", yêu cầu " + quantity);
        }
    }

    private InventoryTransaction newTransaction(Part part, TransactionType type, int quantity,
                                                int stockBefore, int stockAfter,
                                                StockOperationRequest request, UUID actorId) {
        return InventoryTransaction.builder()
                .part(part)
                .type(type)
                .quantity(quantity)
                .stockBefore(stockBefore)
                .stockAfter(stockAfter)
                .referenceType(ReferenceType.WORK_ORDER)
                .referenceId(request.referenceId())
                .createdBy(actorId)
                .note(request.note() == null || request.note().isBlank() ? null : request.note().trim())
                .build();
    }

    private List<InventoryTransactionResponse> save(Map<UUID, Part> parts,
                                                    List<InventoryTransaction> ledger,
                                                    String action,
                                                    UUID referenceId) {
        partRepository.saveAll(parts.values());
        List<InventoryTransactionResponse> responses = inventoryTransactionRepository.saveAll(ledger).stream()
                .map(inventoryTransactionMapper::toResponse)
                .toList();
        log.info("Đã {} tồn kho cho Work Order {}: {} phụ tùng", action, referenceId, responses.size());
        return responses;
    }
}

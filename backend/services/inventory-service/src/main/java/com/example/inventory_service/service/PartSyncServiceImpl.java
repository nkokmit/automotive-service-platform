package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.PartPricingRequest;
import com.example.inventory_service.dto.request.StockAvailabilityRequest;
import com.example.inventory_service.dto.request.StockItemRequest;
import com.example.inventory_service.dto.response.PartPricingResponse;
import com.example.inventory_service.dto.response.StockAvailabilityResponse;
import com.example.inventory_service.entity.Part;
import com.example.inventory_service.exception.PartNotFoundException;
import com.example.inventory_service.repository.PartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Triển khai hai endpoint đồng bộ: kiểm tra tồn kho và lấy đơn giá.
 *
 * <p>Cả hai đều là truy vấn đọc, không khóa dòng {@code parts} và không ghi
 * sổ kho: người gọi chỉ cần một ảnh chụp tồn kho tại thời điểm gọi.
 *
 * <p>Cùng một phụ tùng xuất hiện nhiều dòng trong request được gộp lại
 * ({@link LinkedHashMap}) để số lượng và tổng tiền tính trên tổng thực tế,
 * đồng thời giữ thứ tự dòng đầu tiên để người gọi khớp được kết quả với
 * dòng của mình.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PartSyncServiceImpl implements PartSyncService {

    /** Số chữ số thập phân của {@code selling_price} (DECIMAL(12,2)). */
    private static final int PRICE_SCALE = 2;

    private final PartRepository partRepository;

    @Override
    public List<StockAvailabilityResponse> checkAvailability(StockAvailabilityRequest request) {
        Map<UUID, Integer> quantities = mergeQuantities(request.items());
        Map<UUID, Part> parts = loadParts(quantities.keySet());

        List<StockAvailabilityResponse> responses = new ArrayList<>();
        for (Map.Entry<UUID, Integer> entry : quantities.entrySet()) {
            Part part = parts.get(entry.getKey());
            int quantity = entry.getValue();
            int available = part.getOnHandStock() - part.getReservedStock();
            boolean active = Boolean.TRUE.equals(part.getIsActive());

            responses.add(new StockAvailabilityResponse(
                    part.getId(),
                    part.getSku(),
                    part.getName(),
                    quantity,
                    part.getOnHandStock(),
                    part.getReservedStock(),
                    available,
                    active && quantity <= available,
                    active));
        }
        return responses;
    }

    @Override
    public List<PartPricingResponse> getPricing(PartPricingRequest request) {
        Map<UUID, Integer> quantities = mergeQuantities(request.items());
        Map<UUID, Part> parts = loadParts(quantities.keySet());

        List<PartPricingResponse> responses = new ArrayList<>();
        for (Map.Entry<UUID, Integer> entry : quantities.entrySet()) {
            Part part = parts.get(entry.getKey());
            int quantity = entry.getValue();
            BigDecimal sellingPrice = part.getSellingPrice();

            responses.add(new PartPricingResponse(
                    part.getId(),
                    part.getSku(),
                    part.getName(),
                    part.getUnit(),
                    sellingPrice,
                    quantity,
                    sellingPrice.multiply(BigDecimal.valueOf(quantity))
                            .setScale(PRICE_SCALE, RoundingMode.HALF_UP),
                    part.getOnHandStock() - part.getReservedStock(),
                    Boolean.TRUE.equals(part.getIsActive())));
        }
        return responses;
    }

    /**
     * Gộp các dòng trùng {@code partId}, giữ thứ tự xuất hiện lần đầu.
     */
    private Map<UUID, Integer> mergeQuantities(List<StockItemRequest> items) {
        Map<UUID, Integer> quantities = new LinkedHashMap<>();
        for (StockItemRequest item : items) {
            quantities.merge(item.partId(), item.quantity(), Integer::sum);
        }
        return quantities;
    }

    /**
     * Nạp các phụ tùng được yêu cầu. Thiếu phụ tùng nào thì báo lỗi tương ứng
     * thay vì âm thầm bỏ qua: người gọi cần biết chính xác dòng nào không hợp
     * lệ thay vì nhận một báo giá thiếu dòng.
     */
    private Map<UUID, Part> loadParts(Iterable<UUID> partIds) {
        List<UUID> ids = new ArrayList<>();
        partIds.forEach(ids::add);

        Map<UUID, Part> parts = new LinkedHashMap<>();
        for (Part part : partRepository.findAllById(ids)) {
            parts.put(part.getId(), part);
        }
        for (UUID id : ids) {
            if (!parts.containsKey(id)) {
                throw new PartNotFoundException("Không tìm thấy phụ tùng với id: " + id);
            }
        }
        return parts;
    }
}

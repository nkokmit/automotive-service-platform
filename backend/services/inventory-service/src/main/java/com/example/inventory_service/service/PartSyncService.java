package com.example.inventory_service.service;

import com.example.inventory_service.dto.request.PartPricingRequest;
import com.example.inventory_service.dto.request.StockAvailabilityRequest;
import com.example.inventory_service.dto.response.PartPricingResponse;
import com.example.inventory_service.dto.response.StockAvailabilityResponse;

import java.util.List;

/**
 * API đồng bộ cho các service khác gọi (PLAN.md §4.3).
 *
 * <p>Hai endpoint này trả lời ngay cho người gọi nên phải là truy vấn thuần
 * túy: không giữ state của client, không tạo phiên, không ghi sổ kho.
 */
public interface PartSyncService {

    /**
     * Kiểm tra tồn kho tức thời cho một danh sách dòng báo giá.
     */
    List<StockAvailabilityResponse> checkAvailability(StockAvailabilityRequest request);

    /**
     * Lấy đơn giá bán và tổng tiền theo từng dòng báo giá.
     */
    List<PartPricingResponse> getPricing(PartPricingRequest request);
}

package com.example.billing_service.repository;

import com.example.billing_service.enums.InvoiceItemType;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Doanh thu gom theo một hạng mục (dịch vụ hoặc phụ tùng).
 *
 * <p>Gộp theo {@code catalog_id} + {@code item_type} để cùng một dịch vụ xuất
 * hiện trên nhiều hóa đơn vẫn chỉ có một dòng trong báo cáo.
 */
public interface RevenueByItemProjection {

    UUID getCatalogId();

    InvoiceItemType getItemType();

    String getSnapshotCode();

    String getSnapshotName();

    Long getQuantity();

    BigDecimal getGrossRevenue();

    /** Doanh thu thuần — đã phân bổ chiết khấu/thuế theo tỉ lệ dòng hàng. */
    BigDecimal getNetRevenue();
}

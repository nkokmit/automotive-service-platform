package com.example.billing_service.repository;

import java.math.BigDecimal;

/** Tổng tiền thu / hoàn trong một khoảng thời gian. */
public interface PaymentAggregateProjection {

    /** Tổng tiền thu còn hiệu lực (giao dịch SUCCEEDED). */
    BigDecimal getCollectedRevenue();

    /** Tổng tiền đã hoàn (giao dịch REFUNDED). */
    BigDecimal getRefundedRevenue();
}

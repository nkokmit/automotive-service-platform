package com.example.billing_service.repository;

import com.example.billing_service.enums.PaymentMethod;

import java.math.BigDecimal;

/** Thanh toán gom theo phương thức thanh toán. */
public interface PaymentBreakdownProjection {

    PaymentMethod getPaymentMethod();

    Long getTransactionCount();

    /** Tổng tiền thu còn hiệu lực (đã trừ hoàn). */
    BigDecimal getCollectedAmount();

    /** Tổng tiền đã hoàn trong kỳ. */
    BigDecimal getRefundedAmount();
}

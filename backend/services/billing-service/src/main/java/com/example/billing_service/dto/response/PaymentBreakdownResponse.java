package com.example.billing_service.dto.response;

import com.example.billing_service.enums.PaymentMethod;

import java.math.BigDecimal;

/**
 * Phân bổ thanh toán theo phương thức (tiền mặt / chuyển khoản / thẻ).
 *
 * <p>{@code collectedAmount} là tiền thực còn hiệu lực (đã trừ hoàn tiền),
 * {@code refundedAmount} là tổng tiền đã hoàn trong kỳ.
 */
public record PaymentBreakdownResponse(
        PaymentMethod paymentMethod,
        long transactionCount,
        /** Tổng tiền đã thu (chỉ tính giao dịch còn hiệu lực). */
        BigDecimal collectedAmount,
        /** Tổng tiền đã hoàn trong kỳ. */
        BigDecimal refundedAmount,
        /** Tỉ lệ chiếm trong tổng tiền đã thu (0..1). */
        BigDecimal ratio
) {
    public PaymentBreakdownResponse {
        collectedAmount = scale(collectedAmount);
        refundedAmount = scale(refundedAmount);
        ratio = scale(ratio);
    }

    private static BigDecimal scale(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}

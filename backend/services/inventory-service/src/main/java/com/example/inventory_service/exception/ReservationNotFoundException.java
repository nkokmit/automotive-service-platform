package com.example.inventory_service.exception;

/**
 * Không có giữ chỗ còn hiệu lực đủ số lượng để xuất kho hoặc giải phóng.
 *
 * <p>Số còn giữ chỗ = SUM(RESERVE) - SUM(RELEASE) - SUM(EXPORT) theo
 * (reference_type, reference_id, part_id).
 */
public class ReservationNotFoundException extends ApiException {
    public ReservationNotFoundException(String message) {
        super(ErrorCode.RESERVATION_NOT_FOUND, message);
    }
}

package com.example.customer_vehicle_service.exception;

/**
 * Tài khoản đã được liên kết với một hồ sơ khách hàng khác.
 *
 * <p>Bám theo {@code ErrorCode.CUSTOMER_USER_ID_EXISTS} vì {@code user_id} là
 * cột duy nhất của {@code customers} được ràng buộc UNIQUE — số điện thoại và
 * email cố ý cho phép trùng (một gia đình có thể dùng chung số điện thoại).
 */
public class CustomerAlreadyExistsException extends ApiException {

    public CustomerAlreadyExistsException(String message) {
        super(ErrorCode.CUSTOMER_USER_ID_EXISTS, message);
    }
}
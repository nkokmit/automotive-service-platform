package com.example.customer_vehicle_service.exception;

/**
 * Tài khoản đã được liên kết với một hồ sơ khách hàng khác.
 *
 * <p>Bám theo {@code ErrorCode.CUSTOMER_USER_ID_EXISTS} vì tài khoản đã được
 * liên kết với một hồ sơ khác. Email và số điện thoại có exception riêng.
 */
public class CustomerAlreadyExistsException extends ApiException {

    public CustomerAlreadyExistsException(String message) {
        super(ErrorCode.CUSTOMER_USER_ID_EXISTS, message);
    }
}
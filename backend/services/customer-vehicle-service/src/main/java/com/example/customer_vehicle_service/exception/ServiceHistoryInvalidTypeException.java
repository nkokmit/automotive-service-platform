package com.example.customer_vehicle_service.exception;

/**
 * Client cố tạo bản ghi lịch sử thuộc loại dành riêng cho hệ thống
 * ({@link com.example.customer_vehicle_service.enums.ServiceRecordType#GARAGE_SERVICE}).
 *
 * <p>Lý do tách riêng khỏi {@code INVALID_REQUEST}: đây là vi phạm quy tắc
 * nghiệp vụ của PLAN.md bước 5 — client không được tự sinh bản ghi lịch sử hệ
 * thống, loại đó chỉ được tạo bởi Kafka consumer ở bước 6.
 */
public class ServiceHistoryInvalidTypeException extends ApiException {

    public ServiceHistoryInvalidTypeException(String message) {
        super(ErrorCode.SERVICE_HISTORY_INVALID_TYPE, message);
    }
}
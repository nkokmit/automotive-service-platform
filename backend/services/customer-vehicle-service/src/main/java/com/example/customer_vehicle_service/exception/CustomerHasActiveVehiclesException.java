package com.example.customer_vehicle_service.exception;

/**
 * Khách hàng còn xe đang hoạt động nên không thể xoá mềm (PLAN.md bước 3).
 *
 * <p>Cần giữ nguyên lịch sử: xoá cứng khách hàng sẽ vi phạm ràng buộc
 * {@code fk_vehicles_customer} và làm mất dấu vết của các xe đang vận hành.
 */
public class CustomerHasActiveVehiclesException extends ApiException {

    public CustomerHasActiveVehiclesException(String message) {
        super(ErrorCode.CUSTOMER_HAS_ACTIVE_VEHICLES, message);
    }
}
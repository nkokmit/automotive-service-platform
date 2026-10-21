package com.example.customer_vehicle_service.exception;

/**
 * VIN đã gắn với một xe khác (PLAN.md bước 4).
 *
 * <p>Khớp với ràng buộc {@code uk_vehicles_vin} — cột này UNIQUE thật trong DB
 * nên VIN không thể trùng, kể cả khi xe cũ đã bị xoá mềm (xem
 * {@code VehicleRepository#countByVinIncludingDeleted}).
 *
 * <p>Cần exception riêng thay vì dùng lại {@code VEHICLE_ALREADY_EXISTS} vì biển
 * số cố ý <b>không</b> unique vĩnh viễn (có thể được tái sử dụng cho xe khác sau
 * khi xe cũ ngừng lưu hành), còn VIN thì luôn là định danh duy nhất của xe.
 */
public class VehicleVinAlreadyExistsException extends ApiException {

    public VehicleVinAlreadyExistsException(String message) {
        super(ErrorCode.VEHICLE_VIN_EXISTS, message);
    }
}
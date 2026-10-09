package com.example.customer_vehicle_service.enums;

/**
 * Nguồn/loại bản ghi lịch sử bảo dưỡng.
 *
 * <p>Lưu {@code STRING} trong DB (không dùng ordinal) để thêm/bỏ giá trị giữa
 * các bản deploy không làm hỏng dữ liệu cũ.
 */
public enum ServiceRecordType {

    /**
     * Dịch vụ được thực hiện qua nền tảng (sinh ra từ Work Order hoàn thành).
     */
    GARAGE_SERVICE,

    /**
     * Dịch vụ thực hiện tại gara bên ngoài, nhập bởi nhân viên.
     */
    EXTERNAL_SERVICE,

    /**
     * Thông tin do khách hàng cung cấp, chưa được xác minh độc lập.
     */
    CUSTOMER_REPORTED
}
package com.example.inventory_service.exception;

/**
 * Mã lỗi thống nhất cho inventory-service.
 *
 * <p>Quy ước:
 * <ul>
 *   <li>9999 / 1000 - lỗi chung, giữ nguyên số để client xử lý thống nhất</li>
 *   <li>14xx - authentication/authorization, cố ý trùng với các service khác
 *       (1401 / 1403)</li>
 *   <li>40xx - ServiceCategory · 41xx - Service · 42xx - PartCategory ·
 *       43xx - Part · 44xx - Supplier · 45xx - PurchaseOrder ·
 *       46xx - tồn kho & sổ kho</li>
 * </ul>
 */
public enum ErrorCode {

    // Chung
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi không xác định"),
    INVALID_REQUEST(1000, "Yêu cầu không hợp lệ"),

    // ServiceCategory (40xx)
    SERVICE_CATEGORY_NOT_FOUND(4001, "Không tìm thấy nhóm dịch vụ"),
    SERVICE_CATEGORY_ALREADY_EXISTS(4002, "Mã nhóm dịch vụ đã tồn tại"),
    SERVICE_CATEGORY_IN_USE(4003, "Nhóm dịch vụ đang có dịch vụ nên không thể xóa"),

    // Service (41xx)
    SERVICE_NOT_FOUND(4101, "Không tìm thấy dịch vụ"),
    SERVICE_BOM_NOT_FOUND(4103, "Không tìm thấy dòng định mức của dịch vụ"),
    SERVICE_BOM_ALREADY_EXISTS(4104, "Phụ tùng đã có trong định mức của dịch vụ"),
    SERVICE_ALREADY_EXISTS(4102, "Mã dịch vụ đã tồn tại"),

    // PartCategory (42xx)
    PART_CATEGORY_NOT_FOUND(4201, "Không tìm thấy nhóm phụ tùng"),
    PART_CATEGORY_ALREADY_EXISTS(4202, "Mã nhóm phụ tùng đã tồn tại"),
    PART_CATEGORY_IN_USE(4203, "Nhóm phụ tùng đang có phụ tùng nên không thể xóa"),

    // Part (43xx)
    PART_NOT_FOUND(4301, "Không tìm thấy phụ tùng"),
    PART_COMPATIBILITY_NOT_FOUND(4303, "Không tìm thấy dòng xe tương thích của phụ tùng"),
    PART_COMPATIBILITY_ALREADY_EXISTS(4304, "Dòng xe tương thích đã tồn tại cho phụ tùng"),
    PART_ALREADY_EXISTS(4302, "Mã SKU phụ tùng đã tồn tại"),

    // Supplier (44xx)
    SUPPLIER_NOT_FOUND(4401, "Không tìm thấy nhà cung cấp"),
    SUPPLIER_ALREADY_EXISTS(4402, "Mã nhà cung cấp đã tồn tại"),
    SUPPLIER_IN_USE(4403, "Nhà cung cấp đang có đơn nhập hàng nên không thể xóa"),

    // PurchaseOrder (45xx)
    PURCHASE_ORDER_NOT_FOUND(4501, "Không tìm thấy đơn nhập hàng"),
    PURCHASE_ORDER_ALREADY_EXISTS(4502, "Mã đơn nhập hàng đã tồn tại"),
    PURCHASE_ORDER_INVALID_STATUS(4503, "Trạng thái đơn nhập hàng không cho phép thao tác này"),
    PURCHASE_ORDER_EMPTY(4504, "Đơn nhập hàng phải có ít nhất một mặt hàng"),

    // Tồn kho & sổ kho (46xx)
    INSUFFICIENT_STOCK(4601, "Không đủ tồn kho"),
    INVENTORY_TRANSACTION_NOT_FOUND(4602, "Không tìm thấy giao dịch kho"),
    RESERVATION_NOT_FOUND(4603, "Không tìm thấy giao dịch giữ chỗ tồn kho"),

    // Authentication & Authorization (14xx)
    UNAUTHENTICATED(1401, "Chưa đăng nhập hoặc token không hợp lệ"),
    UNAUTHORIZED(1403, "Bạn không có quyền");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}

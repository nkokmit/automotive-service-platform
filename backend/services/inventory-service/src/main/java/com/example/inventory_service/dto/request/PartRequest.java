package com.example.inventory_service.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Thông tin danh mục phụ tùng.
 *
 * <p>Giá vốn không nằm trong payload này: nó chỉ thay đổi qua đơn nhập hàng và
 * các thao tác kho để sổ kho luôn khớp. Tồn kho tạo mới có thể nhập sẵn qua
 * {@code initialStock}; sau đó mọi biến động đi qua {@code POST /api/parts/{id}/stock}.
 *
 * <p>{@code sku} không bắt buộc: nếu để trống, service sẽ tự sinh mã. Người dùng
 * bình thường không cần biết khái niệm SKU, admin vẫn có thể nhập tay nếu muốn.
 */
public record PartRequest(
        @NotNull(message = "Nhóm phụ tùng không được để trống")
        UUID categoryId,

        @Size(max = 50, message = "SKU tối đa 50 ký tự")
        String sku,

        @Size(max = 50, message = "Mã OEM tối đa 50 ký tự")
        String oemCode,

        @NotBlank(message = "Tên phụ tùng không được để trống")
        @Size(max = 150, message = "Tên phụ tùng tối đa 150 ký tự")
        String name,

        @Size(max = 100, message = "Hãng tối đa 100 ký tự")
        String brand,

        @Size(max = 500, message = "Đường dẫn ảnh tối đa 500 ký tự")
        String imageUrl,

        @Size(max = 4000, message = "Mô tả tối đa 4000 ký tự")
        String description,

        @NotBlank(message = "Đơn vị tính không được để trống")
        @Size(max = 20, message = "Đơn vị tính tối đa 20 ký tự")
        String unit,

        @NotNull(message = "Giá bán không được để trống")
        @DecimalMin(value = "0.00", message = "Giá bán không được âm")
        @Digits(integer = 10, fraction = 2, message = "Giá bán tối đa 10 chữ số nguyên và 2 chữ số thập phân")
        BigDecimal sellingPrice,

        @Min(value = 0, message = "Mức tồn tối thiểu không được âm")
        Integer minStockLevel,

        /**
         * Tồn kho ban đầu khi tạo mới (số lượng thực nhập kho lần đầu).
         * Chỉ có tác dụng lúc tạo; khi cập nhật phải dùng
         * {@code POST /api/parts/{partId}/stock}.
         */
        @Min(value = 0, message = "Tồn kho ban đầu không được âm")
        Integer initialStock,

        Boolean isActive
) {
}

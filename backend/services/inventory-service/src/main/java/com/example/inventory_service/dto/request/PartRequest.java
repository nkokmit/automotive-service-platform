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
 * Thông tin danh mục phụ tùng. Không chứa tồn kho và giá vốn: hai giá trị này
 * chỉ thay đổi qua đơn nhập hàng và các thao tác kho để sổ kho luôn khớp.
 */
public record PartRequest(
        @NotNull(message = "Nhóm phụ tùng không được để trống")
        UUID categoryId,

        @NotBlank(message = "SKU không được để trống")
        @Size(max = 50, message = "SKU tối đa 50 ký tự")
        String sku,

        @Size(max = 50, message = "Mã OEM tối đa 50 ký tự")
        String oemCode,

        @NotBlank(message = "Tên phụ tùng không được để trống")
        @Size(max = 150, message = "Tên phụ tùng tối đa 150 ký tự")
        String name,

        @Size(max = 100, message = "Hãng tối đa 100 ký tự")
        String brand,

        @NotBlank(message = "Đơn vị tính không được để trống")
        @Size(max = 20, message = "Đơn vị tính tối đa 20 ký tự")
        String unit,

        @NotNull(message = "Giá bán không được để trống")
        @DecimalMin(value = "0.00", message = "Giá bán không được âm")
        @Digits(integer = 10, fraction = 2, message = "Giá bán tối đa 10 chữ số nguyên và 2 chữ số thập phân")
        BigDecimal sellingPrice,

        @Min(value = 0, message = "Mức tồn tối thiểu không được âm")
        Integer minStockLevel,

        Boolean isActive
) {
}

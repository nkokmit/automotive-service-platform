package com.example.inventory_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupplierRequest(
        @NotBlank(message = "Mã nhà cung cấp không được để trống")
        @Size(max = 30, message = "Mã nhà cung cấp tối đa 30 ký tự")
        String code,

        @NotBlank(message = "Tên nhà cung cấp không được để trống")
        @Size(max = 150, message = "Tên nhà cung cấp tối đa 150 ký tự")
        String name,

        @Size(max = 20, message = "Mã số thuế tối đa 20 ký tự")
        String taxCode,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
        String phone,

        @Email(message = "Email không hợp lệ")
        @Size(max = 100, message = "Email tối đa 100 ký tự")
        String email,

        @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
        String address,

        Boolean isActive
) {
}

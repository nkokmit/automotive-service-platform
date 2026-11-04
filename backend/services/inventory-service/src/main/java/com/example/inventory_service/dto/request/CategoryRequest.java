package com.example.inventory_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Dùng chung cho nhóm dịch vụ và nhóm phụ tùng (hai bảng có cùng cấu trúc).
 */
public record CategoryRequest(
        @NotBlank(message = "Mã nhóm không được để trống")
        @Size(max = 30, message = "Mã nhóm tối đa 30 ký tự")
        String code,

        @NotBlank(message = "Tên nhóm không được để trống")
        @Size(max = 100, message = "Tên nhóm tối đa 100 ký tự")
        String name,

        @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
        String description
) {
}

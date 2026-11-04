package com.example.inventory_service.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Cập nhật dòng định mức. Không đổi phụ tùng: muốn đổi thì xóa dòng và thêm lại.
 */
public record ServiceBomUpdateRequest(
        @NotNull(message = "Số lượng mặc định không được để trống")
        @Min(value = 1, message = "Số lượng mặc định phải lớn hơn 0")
        @JsonProperty("default_quantity")
        @JsonAlias("defaultQuantity")
        Integer defaultQuantity,

        @Size(max = 255, message = "Ghi chú tối đa 255 ký tự")
        String note
) {
}

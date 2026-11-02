package com.example.booking_service.integration;

import com.example.booking_service.common.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

/**
 * Gọi staff-service qua Eureka. Dùng {@code /api/schedules} (khoảng làm việc thật của từng
 * nhân viên), không dùng {@code /api/staff/availability} vì endpoint đó gộp cả cửa sổ
 * thành một khoảng và làm mất các quãng nghỉ giữa ca.
 */
@FeignClient(name = "staff-service", contextId = "staffScheduleClient")
public interface StaffScheduleClient {

    @GetMapping("/api/schedules")
    ApiResponse<List<StaffScheduleContract>> getGarageSchedule(
            @RequestParam("from") String from,
            @RequestParam("to") String to);
}

package com.example.booking_service.integration;

import com.example.booking_service.common.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

/**
 * Gọi API nội bộ của staff-service qua Eureka bằng token dịch vụ (không forward JWT của khách,
 * nên khách không cần STAFF_SCHEDULE_READ). Endpoint chỉ trả khoảng làm việc theo staffId,
 * không có tên/mã nhân viên và đã trừ nghỉ phép/ngoại lệ, giữ nguyên các quãng nghỉ giữa ca.
 */
@FeignClient(name = "staff-service", contextId = "staffScheduleClient",
        configuration = StaffScheduleClientConfig.class)
public interface StaffScheduleClient {

    @GetMapping("/internal/schedules")
    ApiResponse<List<StaffScheduleContract>> getGarageSchedule(
            @RequestParam("from") String from,
            @RequestParam("to") String to);
}

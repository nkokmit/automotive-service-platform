package com.example.work_order_service.service;

import com.example.work_order_service.dto.response.WorkOrderResponse;

public record WorkOrderCreateResult(WorkOrderResponse workOrder, boolean created) {
}

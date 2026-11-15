package com.example.work_order_service.integration;

import com.example.work_order_service.integration.contract.BookingContract;
import com.example.work_order_service.integration.contract.CustomerContract;
import com.example.work_order_service.integration.contract.VehicleContract;

public record WorkOrderDetailContext(
        BookingContract booking,
        CustomerContract customer,
        VehicleContract vehicle
) {
}

package com.example.work_order_service.service;

import com.example.work_order_service.exception.ApiException;
import com.example.work_order_service.exception.ErrorCode;
import com.example.work_order_service.integration.WorkOrderIntegrationService;
import com.example.work_order_service.messaging.event.VehicleCheckedInEvent;
import com.example.work_order_service.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WorkOrderCheckInEventHandler {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderCreationTransaction creationTransaction;
    private final WorkOrderIntegrationService integrationService;

    public void handle(VehicleCheckedInEvent event) {
        validate(event);
        if (workOrderRepository.findByBookingId(event.bookingId()).isPresent()) {
            return;
        }

        // Event được gửi trước khi booking commit nên có thể tới sớm hoặc là event "ma" khi commit lỗi;
        // lỗi ở đây được listener retry có backoff.
        integrationService.requireBookingCheckedIn(event.bookingId(), event.customerId(), event.vehicleId());

        try {
            creationTransaction.createFromCheckInEvent(
                    event.bookingId(),
                    event.customerId(),
                    event.vehicleId(),
                    event.advisorId(),
                    event.odometerIn(),
                    event.vehicleCondition(),
                    event.customerNote());
        } catch (DataIntegrityViolationException exception) {
            if (workOrderRepository.findByBookingId(event.bookingId()).isEmpty()) {
                throw exception;
            }
        }
    }

    private void validate(VehicleCheckedInEvent event) {
        if (event == null
                || event.eventId() == null
                || event.bookingId() == null
                || event.customerId() == null
                || event.vehicleId() == null
                || event.advisorId() == null
                || event.odometerIn() == null
                || event.odometerIn() < 0
                || event.occurredAt() == null) {
            throw new ApiException(ErrorCode.INVALID_REQUEST, "VehicleCheckedInEvent không hợp lệ");
        }
    }
}

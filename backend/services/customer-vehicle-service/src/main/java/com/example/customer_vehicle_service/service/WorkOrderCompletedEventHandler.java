package com.example.customer_vehicle_service.service;

import com.example.customer_vehicle_service.entity.Vehicle;
import com.example.customer_vehicle_service.entity.VehicleServiceHistory;
import com.example.customer_vehicle_service.enums.ServiceRecordType;
import com.example.customer_vehicle_service.messaging.event.WorkOrderCompletedEvent;
import com.example.customer_vehicle_service.messaging.event.WorkOrderCompletedEvent.WorkOrderCompletedPartItem;
import com.example.customer_vehicle_service.messaging.event.WorkOrderCompletedEvent.WorkOrderCompletedServiceItem;
import com.example.customer_vehicle_service.repository.ProcessedEventRepository;
import com.example.customer_vehicle_service.repository.VehicleRepository;
import com.example.customer_vehicle_service.repository.VehicleServiceHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkOrderCompletedEventHandler {

    private static final int SUMMARY_MAX_LENGTH = 255;
    private static final String EVENT_TYPE = WorkOrderCompletedEvent.class.getSimpleName();

    private final ProcessedEventRepository processedEventRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleServiceHistoryRepository historyRepository;

    @Transactional
    public void handle(WorkOrderCompletedEvent event, String topic) {
        validate(event, topic);
        if (processedEventRepository.insertIfAbsent(
                event.eventId().toString(), topic, EVENT_TYPE, event.workOrderId().toString()) == 0) {
            log.info("Bỏ qua WorkOrderCompleted event đã xử lý: workOrderId={}, eventId={}",
                    event.workOrderId(), event.eventId());
            return;
        }

        if (historyRepository.existsByWorkOrderId(event.workOrderId())) {
            log.info("Bỏ qua WorkOrderCompleted event vì Work Order đã có service history: workOrderId={}",
                    event.workOrderId());
            return;
        }

        if (event.services().isEmpty()) {
            log.info("Không tạo service history cho Work Order không có dịch vụ hoàn tất: workOrderId={}",
                    event.workOrderId());
            return;
        }

        Vehicle vehicle = vehicleRepository.findByIdRaw(event.vehicleId())
                .orElseThrow(() -> new IllegalStateException(
                        "Không tìm thấy vehicle " + event.vehicleId()
                                + " cho Work Order " + event.workOrderId()));

        VehicleServiceHistory history = VehicleServiceHistory.builder()
                .vehicle(vehicle)
                .customerId(event.customerId())
                .workOrderId(event.workOrderId())
                .recordType(ServiceRecordType.GARAGE_SERVICE)
                .serviceDate(event.occurredAt())
                .summary(toSummary(event.services()))
                .description(toDescription(event.services(), event.parts()))
                .build();
        historyRepository.save(history);
        log.info("Đã ghi service history từ Work Order {}: historyId={}",
                event.workOrderId(), history.getId());
    }

    private void validate(WorkOrderCompletedEvent event, String topic) {
        if (event == null
                || event.eventId() == null
                || event.workOrderId() == null
                || event.vehicleId() == null
                || event.occurredAt() == null
                || event.services() == null
                || event.parts() == null
                || event.services().stream().anyMatch(item -> item == null
                        || item.name() == null || item.name().isBlank())
                || event.parts().stream().anyMatch(item -> item == null
                        || item.name() == null || item.name().isBlank() || item.quantity() <= 0)
                || topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("WorkOrderCompleted event is missing required data");
        }
    }

    private String toSummary(List<WorkOrderCompletedServiceItem> services) {
        String summary = services.stream()
                .map(WorkOrderCompletedServiceItem::name)
                .collect(Collectors.joining(", "));
        if (summary.codePointCount(0, summary.length()) <= SUMMARY_MAX_LENGTH) {
            return summary;
        }
        log.warn("Service history summary exceeds {} characters; retaining full details in description",
                SUMMARY_MAX_LENGTH);
        int end = summary.offsetByCodePoints(0, SUMMARY_MAX_LENGTH - 3);
        return summary.substring(0, end) + "...";
    }

    private String toDescription(
            List<WorkOrderCompletedServiceItem> services,
            List<WorkOrderCompletedPartItem> parts
    ) {
        StringBuilder description = new StringBuilder("Dịch vụ đã thực hiện:");
        services.forEach(service -> description.append("\n- ").append(service.name()));
        if (!parts.isEmpty()) {
            description.append("\nPhụ tùng đã sử dụng:");
            parts.forEach(part -> {
                description.append("\n- ").append(part.name());
                if (part.sku() != null && !part.sku().isBlank()) {
                    description.append(" (").append(part.sku()).append(')');
                }
                description.append(" x ").append(part.quantity());
                if (part.unit() != null && !part.unit().isBlank()) {
                    description.append(' ').append(part.unit());
                }
            });
        }
        return description.toString();
    }
}

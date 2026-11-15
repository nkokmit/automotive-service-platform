package com.example.work_order_service.repository;

import com.example.work_order_service.entity.WorkOrder;
import com.example.work_order_service.enums.WorkOrderStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:work-order-repository-test;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "eureka.client.enabled=false"
})
class WorkOrderRepositoryTest {

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void filtersByAssignedTechnicianWithoutDuplicateWorkOrders() {
        UUID technicianId = UUID.randomUUID();
        WorkOrder assigned = workOrderRepository.saveAndFlush(workOrder());
        workOrderRepository.saveAndFlush(workOrder());

        UUID estimateId = UUID.randomUUID();
        jdbcTemplate.update("""
                        INSERT INTO estimates
                            (id, code, work_order_id, type, status, total_labor_amount,
                             total_parts_amount, total_amount, created_by, created_at, updated_at)
                        VALUES (?, ?, ?, 'INITIAL', 'DRAFT', 0, 0, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        """,
                estimateId.toString(), "EST-" + estimateId, assigned.getId().toString(),
                UUID.randomUUID().toString());
        jdbcTemplate.update("""
                INSERT INTO work_order_services
                    (id, estimate_id, service_id, snapshot_name, duration_minutes, required_techs,
                     unit_price, total_price, status, assigned_tech_id, created_at, updated_at)
                VALUES (?, ?, ?, 'Service', 30, 1, 0, 0, 'PENDING', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                       (?, ?, ?, 'Service', 30, 1, 0, 0, 'PENDING', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                UUID.randomUUID().toString(), estimateId.toString(), UUID.randomUUID().toString(),
                technicianId.toString(),
                UUID.randomUUID().toString(), estimateId.toString(), UUID.randomUUID().toString(),
                technicianId.toString());

        Page<WorkOrder> result = workOrderRepository.search(
                null, null, null, null, technicianId.toString(), null, null, PageRequest.of(0, 20));

        assertEquals(1, result.getTotalElements());
        assertEquals(assigned.getId(), result.getContent().get(0).getId());
    }

    private WorkOrder workOrder() {
        return WorkOrder.builder()
                .code("WO-" + UUID.randomUUID())
                .bookingId(UUID.randomUUID())
                .customerId(UUID.randomUUID())
                .vehicleId(UUID.randomUUID())
                .advisorId(UUID.randomUUID())
                .status(WorkOrderStatus.CREATED)
                .odometerIn(0)
                .build();
    }
}

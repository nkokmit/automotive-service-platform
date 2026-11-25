package com.example.billing_service.entity;

import com.example.billing_service.enums.OutboxEventStatus;
import com.example.billing_service.repository.TestOutboxEventRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Regression test cho bug: {@code OutboxEvent.id} có {@code @GeneratedValue} trong khi
 * code tự gán ID → Spring Data đi qua {@code merge()} → Hibernate 7 ném
 * {@code StaleObjectStateException} vì dòng chưa tồn tại trong DB.
 *
 * <p>Test bảo đảm {@code save()} với ID tự gán hoạt động đúng: vẫn tồn tại sau khi
 * commit và không bị coi là entity đã tồn tại (merge).
 */
@DataJpaTest(properties = {
        "DB_URL=jdbc:h2:mem:billing-outbox;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "DB_USERNAME=sa",
        "DB_PASSWORD=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class OutboxEventPersistenceTest {

    @Autowired
    private TestOutboxEventRepository repository;

    @Autowired
    private EntityManager entityManager;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void savingEventWithApplicationAssignedIdPersistsInsteadOfMerging() throws Exception {
        UUID eventId = UUID.randomUUID();
        JsonNode payload = objectMapper.readTree("{\"eventId\":\"" + eventId + "\"}");

        repository.save(OutboxEvent.builder()
                .id(eventId)
                .aggregateType("INVOICE")
                .aggregateId(UUID.randomUUID())
                .topic("billing.invoice-voided")
                .eventType("InvoiceVoidedEvent")
                .payload(payload)
                .nextRetryAt(Instant.now())
                .build());
        entityManager.flush();
        entityManager.clear();

        Optional<OutboxEvent> persisted = repository.findById(eventId);
        assertNotNull(persisted.orElse(null), "Outbox event phải được ghi thành công");
        assertEquals(eventId, persisted.get().getId());
        assertEquals(OutboxEventStatus.PENDING, persisted.get().getStatus());
        assertEquals("billing.invoice-voided", persisted.get().getTopic());
    }
}

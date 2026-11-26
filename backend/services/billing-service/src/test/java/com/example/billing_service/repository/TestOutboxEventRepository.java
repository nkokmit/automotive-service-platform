package com.example.billing_service.repository;

import com.example.billing_service.entity.OutboxEvent;
import org.springframework.data.repository.CrudRepository;

import java.util.UUID;

/**
 * Repository chỉ dùng cho test — tách khỏi {@link OutboxEventRepository} chính vì
 * interface lồng trong test class không được Spring Data scan.
 */
public interface TestOutboxEventRepository extends CrudRepository<OutboxEvent, UUID> {
}
